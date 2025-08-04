const { translateInstruction, translateInstructions } = require('./utils/japanese-to-english');
const {
  enhancePromptForJapan,
  generateWithOpenAI,
  generateWithStability,
  generateWithReplicate,
  getResolution
} = require('./utils/image-generators');
const logger = require('./utils/logger');
const { setCorsHeaders, sendErrorResponse, sendSuccessResponse } = require('./utils/response-helpers');
const { validateGenerateRequest } = require('./utils/input-validator');
const { rateLimiter } = require('./utils/rate-limiter');
const { withErrorHandler } = require('./utils/global-error-handler');

async function handler(req, res) {
  // CORS設定（セキュア）
  if (!setCorsHeaders(res, req)) {
    sendErrorResponse(res, 403, 'CORS policy violation');
    return;
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    sendErrorResponse(res, 405, 'Method not allowed');
    return;
  }

  // レート制限チェック
  const rateLimitResult = rateLimiter.checkApiLimit(req, 'generate');
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil(rateLimitResult.timeUntilReset / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    sendErrorResponse(res, 429, 'レート制限に達しました', 
      `1分間に${rateLimitResult.maxRequests}回までのリクエストが可能です。${retryAfter}秒後に再試行してください。`);
    return;
  }

  // メイン処理を実行
  await generateImage(req, res);
}

module.exports = withErrorHandler(handler);

async function generateImage(req, res) {
  try {
    const validation = validateGenerateRequest(req.body);
    if (!validation.valid) {
      sendErrorResponse(res, 400, validation.error);
      return;
    }

    const validatedRequest = validation.sanitized;
    let { prompt, additionalInstructions = [], api, context } = validatedRequest;
    
    // 日本語の追加指示を英語に翻訳
    const translatedInstructions = await translateInstructions(additionalInstructions);
    
    // メインプロンプトの翻訳
    const englishPrompt = await translateInstruction(prompt);
    
    // 追加の指示を結合
    const combinedPrompt = translatedInstructions.length > 0 
      ? `${englishPrompt}. ${translatedInstructions.join('. ')}`
      : englishPrompt;
    
    // API自動選択
    let apiToUse = api;
    if (api === 'auto' || !api) {
      // 利用可能なAPIから自動選択
      if (process.env.OPENAI_API_KEY) apiToUse = 'openai';
      else if (process.env.STABILITY_API_KEY) apiToUse = 'stability';
      else if (process.env.REPLICATE_API_TOKEN) apiToUse = 'replicate';
      else {
        sendErrorResponse(res, 500, '画像生成APIが設定されていません', 
          '環境変数にAPIキーを設定してください');
        return;
      }
    }

    let result;
    
    try {
      switch (apiToUse) {
        case 'openai':
          if (!process.env.OPENAI_API_KEY) {
            sendErrorResponse(res, 400, 'OpenAI APIキーが設定されていません');
            return;
          }
          result = await generateWithOpenAI(
            combinedPrompt, 
            process.env.OPENAI_API_KEY, 
            context
          );
          break;
          
        case 'stability':
          if (!process.env.STABILITY_API_KEY) {
            sendErrorResponse(res, 400, 'Stability APIキーが設定されていません');
            return;
          }
          result = await generateWithStability(
            combinedPrompt, 
            process.env.STABILITY_API_KEY, 
            context
          );
          break;
          
        case 'replicate':
          if (!process.env.REPLICATE_API_TOKEN) {
            sendErrorResponse(res, 400, 'Replicate APIトークンが設定されていません');
            return;
          }
          result = await generateWithReplicate(
            combinedPrompt, 
            process.env.REPLICATE_API_TOKEN, 
            context
          );
          break;
          
        default:
          sendErrorResponse(res, 400, '無効なAPIが指定されました');
          return;
      }
      
      // 成功レスポンス
      sendSuccessResponse(res, {
        image: result.image,
        metadata: {
          original_prompt: prompt,
          enhanced_prompt: result.prompt || combinedPrompt,
          api_used: apiToUse,
          cost: result.cost,
          analysis: {
            ...result.analysis,
            additional_instructions: additionalInstructions,
            translated_instructions: translatedInstructions
          }
        }
      });
      
    } catch (apiError) {
      logger.error(`${apiToUse} API error:`, apiError);
      
      // APIエラーの詳細なメッセージを構築
      let errorMessage = '画像生成に失敗しました';
      let errorDetails = apiError.message;
      
      if (apiError.message.includes('insufficient_quota') || 
          apiError.message.includes('billing') ||
          apiError.message.includes('credits')) {
        errorMessage = 'APIのクレジットが不足しています';
        errorDetails = `${apiToUse}のアカウントにクレジットを追加してください`;
      } else if (apiError.message.includes('rate_limit')) {
        errorMessage = 'APIのレート制限に達しました';
        errorDetails = 'しばらく待ってから再度お試しください';
      } else if (apiError.message.includes('invalid_api_key')) {
        errorMessage = 'APIキーが無効です';
        errorDetails = '環境変数のAPIキーを確認してください';
      }
      
      sendErrorResponse(res, 500, errorMessage, errorDetails);
    }
    
  } catch (error) {
    logger.error('Image generation error:', error);
    sendErrorResponse(res, 500, '予期しないエラーが発生しました', error.message);
  }
}