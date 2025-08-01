const { translateInstruction, translateInstructions } = require('./utils/japanese-to-english');
const {
  enhancePromptForJapan,
  generateWithOpenAI,
  generateWithStability,
  generateWithReplicate,
  getResolution
} = require('./utils/image-generators');
const logger = require('./utils/logger.ts');
const { setCorsHeaders, sendErrorResponse, sendSuccessResponse } = require('./utils/response-helpers');
const { validateGenerateRequest } = require('./utils/input-validator.ts');
const { rateLimiter } = require('./utils/rate-limiter.ts');
const { withErrorHandler } = require('./utils/global-error-handler');

async function handler(req, res) {
  // CORS設定（セキュア）
  if (!setCorsHeaders(res, req)) {
    return sendErrorResponse(res, 403, 'CORS policy violation');
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, 405, 'Method not allowed');
  }

  // レート制限チェック
  const rateLimitResult = rateLimiter.checkApiLimit(req, 'generate');
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil(rateLimitResult.timeUntilReset / 1000);
    res.setHeader('Retry-After', retryAfter);
    return sendErrorResponse(res, 429, 'レート制限に達しました', 
      `1分間に${rateLimitResult.maxRequests}回までのリクエストが可能です。${retryAfter}秒後に再試行してください。`);
  }

  // メイン処理を実行
  return await generateImage(req, res);
}

module.exports = withErrorHandler(handler);

async function generateImage(req, res) {

  try {
    // 入力検証（包括的）
    const validation = validateGenerateRequest(req.body);
    if (!validation.valid) {
      return sendErrorResponse(res, 400, validation.error);
    }

    const { prompt, context, api: selectedApi, additionalInstructions } = validation.sanitized;
    
    // 日本語の追加指示を英語に変換
    const translatedInstructions = translateInstructions(additionalInstructions);
    
    // メインプロンプトと追加指示を結合
    let combinedPrompt = prompt;
    if (translatedInstructions.length > 0) {
      combinedPrompt = `${prompt}, ${translatedInstructions.join(', ')}`;
    }

    // API選択ロジック（環境変数ベース）
    let apiToUse = selectedApi.toLowerCase(); // 大文字小文字を正規化
    
    if (apiToUse === 'auto') {
      if (process.env.OPENAI_API_KEY) apiToUse = 'openai';
      else if (process.env.STABILITY_API_KEY) apiToUse = 'stability';
      else if (process.env.REPLICATE_API_TOKEN) apiToUse = 'replicate';
      else {
        return sendErrorResponse(res, 500, 'APIキーが設定されていません。Vercelの環境変数にAPIキーを設定してください');
      }
    }
    

    let generatedImage, cost = 0, apiUsed = '';
    const startTime = Date.now();

    try {
      switch (apiToUse) {
        case 'openai':
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
          }
          const result = await generateWithOpenAI(enhancePromptForJapan(combinedPrompt, context), process.env.OPENAI_API_KEY, context);
          generatedImage = result.image;
          cost = result.cost;
          apiUsed = 'openai';
          break;

        case 'stability':
          if (!process.env.STABILITY_API_KEY) {
            throw new Error('Stability AI API key is not configured');
          }
          const stabilityResult = await generateWithStability(enhancePromptForJapan(combinedPrompt, context), process.env.STABILITY_API_KEY, context);
          generatedImage = stabilityResult.image;
          cost = stabilityResult.cost;
          apiUsed = 'stability';
          break;

        case 'replicate':
          if (!process.env.REPLICATE_API_TOKEN) {
            throw new Error('Replicate API token is not configured');
          }
          const replicateResult = await generateWithReplicate(enhancePromptForJapan(combinedPrompt, context), process.env.REPLICATE_API_TOKEN, context);
          generatedImage = replicateResult.image;
          cost = replicateResult.cost;
          apiUsed = 'replicate';
          break;

        default:
          // 無効なAPIが選択された場合
          return sendErrorResponse(res, 400, '無効なAPIが選択されました。利用可能なAPI: openai, stability, replicate');
      }
    } catch (apiError) {
      logger.error(`API Error (${apiToUse}):`, apiError);
      // エラーをそのまま投げる - デモ画像は使わない
      return sendErrorResponse(res, 500, `画像生成に失敗しました (${apiToUse}): ${apiError.message}`);
    }

    const generationTime = Date.now() - startTime;

    return sendSuccessResponse(res, {
      image: generatedImage,
      metadata: {
        original_prompt: prompt,
        enhanced_prompt: prompt + ' - Professional Japanese style',
        api_used: apiUsed,
        cost: cost,
        generation_time: generationTime,
        resolution: getResolution(apiUsed),
        format: 'PNG/JPEG',
        context: context,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Generate API Error:', error);
    return sendErrorResponse(res, 500, `サーバーエラー: ${error.message}`);
  }
}

