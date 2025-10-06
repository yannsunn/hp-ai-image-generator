const { translateInstruction, translateInstructions } = require('./utils/japanese-to-english');
const { generateWithGemini } = require('./utils/image-generators');
const logger = require('./utils/logger');
const { sendErrorResponse, sendSuccessResponse } = require('./utils/response-helpers');
const { validateGenerateRequest } = require('./utils/input-validator');
const { withErrorHandler } = require('./utils/global-error-handler');
const { auditImageGeneration, auditApiError } = require('./utils/audit-logger');
const { withStandardMiddleware, checkGeminiApiKey } = require('./utils/middleware');

async function handler(req, res) {
  // 標準ミドルウェア適用（CORS、OPTIONS、メソッド検証、レート制限）
  const canProceed = await withStandardMiddleware(req, res, 'generate');
  if (!canProceed) return;

  await generateImage(req, res);
}

module.exports = withErrorHandler(handler);

async function generateImage(req, res) {
  try {
    logger.info('Generate Image Request', {
      body: req.body,
      environment: {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '設定済み (長さ: ' + process.env.GEMINI_API_KEY.length + ')' : '未設定',
        GEMINI_IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL || '未設定',
        NODE_ENV: process.env.NODE_ENV
      }
    });

    const validation = validateGenerateRequest(req.body);
    if (!validation.valid) {
      logger.error('Validation failed:', validation.error);
      sendErrorResponse(res, 400, validation.error);
      return;
    }

    const validatedRequest = validation.sanitized;
    const { prompt, additionalInstructions = [], api, context } = validatedRequest;

    logger.info('Validated request:', { prompt, api, context });
    
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
      // Gemini APIを使用
      if (process.env.GEMINI_API_KEY) apiToUse = 'gemini';
      else {
        sendErrorResponse(res, 500, '画像生成APIが設定されていません',
          'Vercel環境変数にGEMINI_API_KEYを設定してください');
        return;
      }
    }

    let result;

    try {
      logger.info('API selection:', apiToUse);
      logger.info('Combined prompt:', combinedPrompt);

      switch (apiToUse) {
        case 'gemini': {
          const apiKeyCheck = checkGeminiApiKey();
          if (!apiKeyCheck.valid) {
            sendErrorResponse(res, 400, apiKeyCheck.error, apiKeyCheck.details);
            return;
          }
          logger.info('Calling generateWithGemini...');
          result = await generateWithGemini(
            combinedPrompt,
            process.env.GEMINI_API_KEY,
            context
          );
          logger.info('generateWithGemini completed successfully');
          break;
        }

        default:
          sendErrorResponse(res, 400, '無効なAPIが指定されました',
            '現在サポートされているのはGemini APIのみです');
          return;
      }
      
      // 成功レスポンス
      const responseData = {
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
      };

      // 監査ログ記録
      await auditImageGeneration(req, responseData);

      sendSuccessResponse(res, responseData);

    } catch (apiError) {
      logger.error('API Error Caught', {
        api: apiToUse,
        message: apiError.message,
        stack: apiError.stack,
        name: apiError.name,
        fullError: JSON.stringify(apiError, Object.getOwnPropertyNames(apiError))
      });

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

      // 監査ログ記録
      await auditApiError(req, 'image_generation_failed', errorMessage, {
        api: apiToUse,
        error_details: errorDetails
      });

      sendErrorResponse(res, 500, errorMessage, errorDetails);
    }

  } catch (error) {
    logger.error('Outer Error Caught', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    sendErrorResponse(res, 500, '予期しないエラーが発生しました', error.message);
  }
}