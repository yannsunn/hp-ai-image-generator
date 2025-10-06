const { validateGenerateRequest } = require('../utils/input-validator');
const { translateInstructions } = require('../utils/japanese-to-english');
const {
  enhancePromptForJapan,
  generateWithGemini,
  getResolution
} = require('../utils/image-generators');
const logger = require('../utils/logger');
const { sendErrorResponse, sendSuccessResponse } = require('../utils/response-helpers');
const { withStandardMiddleware, checkGeminiApiKey } = require('../utils/middleware');

module.exports = async function handler(req, res) {
  // 標準ミドルウェア適用（CORS、OPTIONS、メソッド検証、レート制限）
  const canProceed = await withStandardMiddleware(req, res, 'generate/batch');
  if (!canProceed) return;

  return batchGenerateImages(req, res);
};

async function batchGenerateImages(req, res) {
  // apiToUseをtryの外で定義
  let apiToUse = 'unknown';

  // 全体のエラーハンドリング
  try {
    
    // 入力検証（包括的）
    const validation = validateGenerateRequest(req.body);
    if (!validation.valid) {
      return sendErrorResponse(res, 400, validation.error);
    }

    const { prompt, count, context, additionalInstructions } = validation.sanitized;
    
    // 日本語の追加指示を英語に変換
    const translatedInstructions = translateInstructions(additionalInstructions);
    
    // メインプロンプトと追加指示を結合
    let combinedPrompt = prompt;
    if (translatedInstructions.length > 0) {
      combinedPrompt = `${prompt}, ${translatedInstructions.join(', ')}`;
    }

    // 生成枚数の検証は input-validator で実施済み

    // API選択ロジック（Gemini固定）
    apiToUse = 'gemini';

    // Gemini APIキーの確認
    const apiKeyCheck = checkGeminiApiKey();
    if (!apiKeyCheck.valid) {
      return sendErrorResponse(res, 500, apiKeyCheck.error, apiKeyCheck.details);
    }
    

    const images = [];
    const errors = [];
    let totalCost = 0;

    // Gemini APIは高速なので4枚ずつ処理
    const batchSize = 4;
    const results = [];

    for (let i = 0; i < count; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, count); j++) {
        batch.push(generateSingleImage(combinedPrompt, context, j));
      }

      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);

      // バッチ間に少し待機（レートリミット対策）
      if (i + batchSize < count) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 結果を処理
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        images.push({
          index,
          image: result.value.image,
          metadata: result.value.metadata
        });
        totalCost += result.value.metadata.cost;
      } else {
        logger.error(`Image ${index} generation failed:`, {
          reason: result.reason,
          message: result.reason?.message,
          stack: result.reason?.stack,
          apiUsed: apiToUse
        });
        errors.push({
          index,
          error: result.reason.message || 'Generation failed',
          details: result.reason.toString()
        });
        
        // エラー時は何も追加しない - エラーをそのまま伝える
      }
    });

    
    // エラーがある場合は失敗として処理
    if (errors.length > 0 && images.length === 0) {
      return sendErrorResponse(res, 500, `すべての画像生成に失敗しました: ${errors.map(e => e.details).join(', ')}`);
    }
    
    // Content-Type を明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    return sendSuccessResponse(res, {
      images,
      errors,
      total_cost: totalCost,
      summary: {
        requested: count,
        generated: images.length,
        failed: errors.length,
        api_used: apiToUse,
        additional_instructions_applied: translatedInstructions.length > 0
      }
    });
  
  } catch (error) {
    logger.error('Batch generate API error:', error);
    logger.error('Error stack:', error.stack);
    
    // 確実にJSONレスポンスを返す
    res.setHeader('Content-Type', 'application/json');
    
    // タイムアウトエラーの場合
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return sendErrorResponse(res, 504, 'タイムアウトエラー: 処理時間が長すぎます。生成枚数を減らすか、単一生成をお試しください。');
    }
    
    return sendErrorResponse(res, 500, `サーバーエラー: ${error.message || 'バッチ画像生成中にエラーが発生しました。'}`);
  }
}

// 単一画像を生成
async function generateSingleImage(prompt, context, index) {
  const startTime = Date.now();

  try {
    // 日本向けのプロンプトを強化
    const japanesePrompt = enhancePromptForJapan(prompt, context);
    const result = await generateWithGemini(japanesePrompt, process.env.GEMINI_API_KEY, context);

    // 成功したら結果を返す
    return {
      image: result.image,
      metadata: {
        original_prompt: prompt,
        enhanced_prompt: japanesePrompt,
        api_used: 'gemini',
        cost: result.cost,
        generation_time: Date.now() - startTime,
        resolution: getResolution('gemini'),
        format: 'PNG',
        model: result.analysis?.model || 'gemini-2.5-flash-image'
      }
    };
  } catch (error) {
    logger.error(`Generation error for image ${index} with Gemini:`, error);
    throw new Error(`画像生成に失敗しました: ${error.message || 'Unknown error'}`);
  }
}

