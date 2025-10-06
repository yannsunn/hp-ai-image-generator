const logger = require('./utils/logger');
const { sendErrorResponse, sendSuccessResponse } = require('./utils/response-helpers');
const { withErrorHandler } = require('./utils/global-error-handler');
const { generateWithGemini } = require('./utils/image-generators');
const { withStandardMiddleware, checkGeminiApiKey } = require('./utils/middleware');

async function handler(req, res) {
  // 標準ミドルウェア適用（CORS、OPTIONS、メソッド検証、レート制限）
  const canProceed = await withStandardMiddleware(req, res, 'generate-all-images');
  if (!canProceed) return;

  await generateAllImages(req, res);
}

module.exports = withErrorHandler(handler);

async function generateAllImages(req, res) {
  try {
    const { suggested_prompts, industry, url, company_info, existing_images } = req.body;

    if (!suggested_prompts || !Array.isArray(suggested_prompts) || suggested_prompts.length === 0) {
      return sendErrorResponse(res, 400, 'suggested_prompts配列が必要です');
    }

    const apiKeyCheck = checkGeminiApiKey();
    if (!apiKeyCheck.valid) {
      return sendErrorResponse(res, 500, apiKeyCheck.error, apiKeyCheck.details);
    }

    logger.info(`Generating ${suggested_prompts.length} images for ${url}`);

    const results = [];
    const errors = [];
    let totalCost = 0;

    // 各プロンプトで画像を生成（並列処理）
    const generationPromises = suggested_prompts.map(async (promptObj, index) => {
      try {
        const startTime = Date.now();

        const result = await generateWithGemini(
          promptObj.prompt,
          process.env.GEMINI_API_KEY,
          {
            industry: industry || 'general',
            contentType: promptObj.type || 'general',
            section: promptObj.section || promptObj.type,
            companySize: company_info?.company_size,
            employeeCount: company_info?.employee_count,
            existing_images: existing_images
          }
        );

        const generatedImage = {
          index,
          type: promptObj.type,
          section: promptObj.section || promptObj.type,
          description: promptObj.description || `${promptObj.type}セクション用の画像`,
          image: result.image,
          prompt: promptObj.prompt,
          metadata: {
            cost: result.cost,
            generation_time: Date.now() - startTime,
            model: result.analysis?.model || 'gemini-2.5-flash-image',
            resolution: '1024x1024',
            format: 'PNG'
          }
        };

        totalCost += result.cost;
        return { success: true, data: generatedImage };

      } catch (error) {
        logger.error(`Image generation failed for ${promptObj.type}:`, error);
        return {
          success: false,
          error: {
            index,
            type: promptObj.type,
            section: promptObj.section,
            message: error.message || '画像生成に失敗しました'
          }
        };
      }
    });

    // すべての生成を待つ
    const settledResults = await Promise.allSettled(generationPromises);

    // 結果を分類
    settledResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          results.push(result.value.data);
        } else {
          errors.push(result.value.error);
        }
      } else {
        errors.push({
          message: result.reason?.message || '不明なエラー',
          details: result.reason?.toString()
        });
      }
    });

    // すべて失敗した場合
    if (results.length === 0) {
      return sendErrorResponse(res, 500, 'すべての画像生成に失敗しました', errors);
    }

    return sendSuccessResponse(res, {
      images: results,
      errors,
      summary: {
        total_requested: suggested_prompts.length,
        generated: results.length,
        failed: errors.length,
        total_cost: totalCost,
        url: url || 'unknown'
      }
    });

  } catch (error) {
    logger.error('Generate all images error:', error);
    return sendErrorResponse(res, 500, `サーバーエラー: ${error.message}`);
  }
}
