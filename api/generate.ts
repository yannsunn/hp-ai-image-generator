import type { Request, Response } from 'express';
import type { GenerateImageRequest, GenerateImageResponse, ApiError } from '../types';
import { translateInstruction, translateInstructions } from './utils/japanese-to-english';
import {
  enhancePromptForJapan,
  generateWithOpenAI,
  generateWithStability,
  generateWithReplicate,
  getResolution
} from './utils/image-generators';
import logger from './utils/logger';
import { setCorsHeaders, sendErrorResponse, sendSuccessResponse } from './utils/response-helpers';
import { validateGenerateRequest } from './utils/input-validator';
import { rateLimiter } from './utils/rate-limiter';
import { withErrorHandler } from './utils/global-error-handler';

async function handler(req: Request, res: Response): Promise<void> {
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

export default withErrorHandler(handler);

async function generateImage(req: Request, res: Response): Promise<void> {
  try {
    // 入力検証（包括的）
    const validation = validateGenerateRequest(req.body);
    if (!validation.valid) {
      sendErrorResponse(res, 400, validation.error || '入力が無効です');
      return;
    }

    const { prompt, context, api: selectedApi, additionalInstructions } = validation.sanitized!;
    
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
        sendErrorResponse(res, 500, 'APIキーが設定されていません。Vercelの環境変数にAPIキーを設定してください');
        return;
      }
    }
    
    let generatedImage: string;
    let cost = 0;
    let apiUsed = '';
    const startTime = Date.now();

    try {
      switch (apiToUse) {
        case 'openai':
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
          }
          const openaiResult = await generateWithOpenAI(
            enhancePromptForJapan(combinedPrompt, context), 
            process.env.OPENAI_API_KEY, 
            context
          );
          generatedImage = openaiResult.image;
          cost = openaiResult.cost;
          apiUsed = 'openai';
          break;

        case 'stability':
          if (!process.env.STABILITY_API_KEY) {
            throw new Error('Stability AI API key is not configured');
          }
          const stabilityResult = await generateWithStability(
            enhancePromptForJapan(combinedPrompt, context), 
            process.env.STABILITY_API_KEY, 
            context
          );
          generatedImage = stabilityResult.image;
          cost = stabilityResult.cost;
          apiUsed = 'stability';
          break;

        case 'replicate':
          if (!process.env.REPLICATE_API_TOKEN) {
            throw new Error('Replicate API token is not configured');
          }
          const replicateResult = await generateWithReplicate(
            enhancePromptForJapan(combinedPrompt, context), 
            process.env.REPLICATE_API_TOKEN, 
            context
          );
          generatedImage = replicateResult.image;
          cost = replicateResult.cost;
          apiUsed = 'replicate';
          break;

        default:
          // 無効なAPIが選択された場合
          sendErrorResponse(res, 400, '無効なAPIが選択されました。利用可能なAPI: openai, stability, replicate');
          return;
      }
    } catch (apiError) {
      const error = apiError as Error;
      logger.error(`API Error (${apiToUse}):`, error);
      // エラーをそのまま投げる - デモ画像は使わない
      sendErrorResponse(res, 500, `画像生成に失敗しました (${apiToUse}): ${error.message}`);
      return;
    }

    const generationTime = Date.now() - startTime;

    const response: GenerateImageResponse = {
      provider: apiUsed,
      model: getResolution(apiUsed),
      images: [{
        url: generatedImage,
        prompt: enhancePromptForJapan(combinedPrompt, context),
        size: getResolution(apiUsed),
        model: apiUsed
      }],
      cost,
      executionTime: generationTime
    };

    sendSuccessResponse(res, {
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
    const err = error as Error;
    logger.error('Generate API Error:', err);
    sendErrorResponse(res, 500, `サーバーエラー: ${err.message}`);
  }
}