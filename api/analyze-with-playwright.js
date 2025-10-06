const logger = require('./utils/logger');
const { sendErrorResponse } = require('./utils/response-helpers');
const { validateUrl } = require('./utils/input-validator');
const { withErrorHandler } = require('./utils/global-error-handler');
const { getCachedAnalysis, setCachedAnalysis } = require('./utils/cache-helper');
const { auditUrlAnalysis } = require('./utils/audit-logger');
const { withStandardMiddleware } = require('./utils/middleware');

async function handler(req, res) {
  // 標準ミドルウェア適用（CORS、OPTIONS、メソッド検証、レート制限）
  const canProceed = await withStandardMiddleware(req, res, 'analyze-with-playwright');
  if (!canProceed) return;

  await analyzeWithPlaywright(req, res);
}

module.exports = withErrorHandler(handler);

async function analyzeWithPlaywright(req, res) {
  try {
    const { url, generateImage = true, useCache = true } = req.body;

    // 入力検証
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      sendErrorResponse(res, 400, urlValidation.error || '無効なURLです');
      return;
    }

    const validatedUrl = urlValidation.sanitized;

    logger.info('Playwright analysis started for:', validatedUrl);

    // キャッシュチェック
    if (useCache) {
      const cachedResult = await getCachedAnalysis(validatedUrl);
      if (cachedResult) {
        logger.info('Returning cached analysis result');

        // 画像生成が要求された場合のみ生成
        let generatedImage = null;
        if (generateImage && cachedResult.suggested_prompt) {
          try {
            const { generateWithGemini } = require('./utils/image-generators');
            if (process.env.GEMINI_API_KEY) {
              const imageResult = await generateWithGemini(
                cachedResult.suggested_prompt,
                process.env.GEMINI_API_KEY,
                {
                  industry: cachedResult.industry,
                  contentType: cachedResult.content_type
                }
              );
              generatedImage = {
                image: imageResult.image,
                cost: imageResult.cost,
                model: imageResult.analysis?.model || 'gemini-2.5-flash-image'
              };
            }
          } catch (imageError) {
            logger.error('Image generation error:', imageError);
          }
        }

        const cachedResponse = {
          ...cachedResult,
          generated_image: generatedImage,
          from_cache: true
        };

        // 監査ログ記録
        await auditUrlAnalysis(req, validatedUrl, cachedResponse);

        return res.status(200).json(cachedResponse);
      }
    }

    // Playwrightを使用した実装（フォールバックとしてCheerioを使用）
    const analysisResult = await analyzeWithPlaywrightAndGemini(validatedUrl);

    if (!analysisResult.success) {
      sendErrorResponse(res, 400, analysisResult.error || '分析に失敗しました', analysisResult.details);
      return;
    }

    // 画像生成が要求された場合
    let generatedImage = null;
    if (generateImage && analysisResult.suggested_prompt) {
      try {
        const { generateWithGemini } = require('./utils/image-generators');

        if (!process.env.GEMINI_API_KEY) {
          logger.warn('GEMINI_API_KEY not set, skipping image generation');
        } else {
          const imageResult = await generateWithGemini(
            analysisResult.suggested_prompt,
            process.env.GEMINI_API_KEY,
            {
              industry: analysisResult.industry,
              contentType: analysisResult.content_type
            }
          );

          generatedImage = {
            image: imageResult.image,
            cost: imageResult.cost,
            model: imageResult.analysis?.model || 'gemini-2.5-flash-image'
          };
        }
      } catch (imageError) {
        logger.error('Image generation error:', imageError);
        // 画像生成エラーは警告として扱い、分析結果は返す
      }
    }

    // 成功レスポンス
    const response = {
      success: true,
      url: validatedUrl,
      title: analysisResult.title,
      content: analysisResult.content,
      industry: analysisResult.industry,
      industry_confidence: analysisResult.industry_confidence,
      content_type: analysisResult.content_type,
      detected_themes: analysisResult.detected_themes || [],
      visual_style: analysisResult.visual_style || {},
      visual_analysis: analysisResult.visual_analysis || null,
      target_audience: analysisResult.target_audience,
      key_features: analysisResult.key_features || [],
      suggested_prompts: analysisResult.suggested_prompts || [],
      suggested_prompt: analysisResult.suggested_prompt,
      image_recommendations: analysisResult.image_recommendations || {},
      screenshot: analysisResult.screenshot || null,
      analysis_method: analysisResult.method || 'gemini-cheerio',
      generated_image: generatedImage,
      analyzed_at: new Date().toISOString(),
      from_cache: false
    };

    // 分析結果をキャッシュに保存（24時間）
    await setCachedAnalysis(validatedUrl, response, 86400);

    // 監査ログ記録
    await auditUrlAnalysis(req, validatedUrl, response);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Playwright analysis error:', error);
    sendErrorResponse(res, 500, `分析エラー: ${error.message || 'サーバー側でエラーが発生しました。'}`);
  }
}

// Playwright + Geminiを使用した分析（フォールバック: Cheerio）
async function analyzeWithPlaywrightAndGemini(url) {
  const { getPageSnapshot, getPageScreenshot, isPlaywrightAvailable } = require('./utils/playwright-helper');

  // Playwrightが利用可能かチェック
  const playwrightAvailable = await isPlaywrightAvailable();

  if (playwrightAvailable) {
    logger.info('Using Playwright for analysis');

    try {
      // Phase 1 & 2: スナップショットとスクリーンショットを並列取得
      const [snapshotResult, screenshotResult] = await Promise.all([
        getPageSnapshot(url),
        getPageScreenshot(url)
      ]);

      if (snapshotResult.success) {

        const { analyzeWebsiteContent, analyzeWebsiteVisually } = require('./utils/gemini-analyzer');

        let analysisResult;

        // スクリーンショットが取得できた場合はマルチモーダル分析を使用
        if (screenshotResult.success && screenshotResult.screenshot) {
          logger.info('Using multimodal visual analysis with screenshot');
          analysisResult = await analyzeWebsiteVisually({
            title: snapshotResult.title,
            description: snapshotResult.description || '',
            textContent: snapshotResult.bodyText
          }, screenshotResult.screenshot, url);
        } else {
          // スクリーンショット取得失敗時はテキスト分析のみ
          logger.info('Using text-only analysis (screenshot unavailable)');
          analysisResult = await analyzeWebsiteContent({
            title: snapshotResult.title,
            description: snapshotResult.description || '',
            textContent: snapshotResult.bodyText
          }, url);
        }

        if (!analysisResult.success) {
          throw new Error(analysisResult.error || 'Gemini分析に失敗しました');
        }

        const analysisData = analysisResult.analysis;

        // ヒーロー画像用のプロンプトを優先的に選択
        const heroPrompt = analysisData.suggested_prompts?.find(p => p.type === 'hero');
        const suggestedPrompt = heroPrompt?.prompt ||
                               analysisData.suggested_prompts?.[0]?.prompt ||
                               `${snapshotResult.title}ウェブサイト用のプロフェッショナルな${analysisData.industry}ビジネス画像`;

        return {
          success: true,
          url,
          title: snapshotResult.title,
          content: {
            description: snapshotResult.description || '',
            text_preview: snapshotResult.bodyText.substring(0, 500)
          },
          industry: analysisData.industry || 'other',
          industry_confidence: analysisData.industry_confidence || 'medium',
          content_type: analysisData.content_type || 'hero',
          detected_themes: analysisData.detected_themes || [],
          visual_style: analysisData.visual_style || {},
          visual_analysis: analysisData.visual_analysis || null,
          target_audience: analysisData.target_audience || 'general',
          key_features: analysisData.key_features || [],
          suggested_prompts: analysisData.suggested_prompts || [],
          suggested_prompt: suggestedPrompt,
          image_recommendations: analysisData.image_recommendations || {},
          screenshot: screenshotResult.success ? screenshotResult.screenshot : null,
          analysis_method: analysisResult.method || 'playwright-gemini',
          method: 'playwright-gemini'
        };
      }
    } catch (playwrightError) {
      logger.warn('Playwright failed, falling back to Cheerio:', playwrightError.message);
    }
  }

  // フォールバック: Cheerio + Gemini
  logger.info('Using Cheerio fallback for analysis');
  return await analyzeWithCheerioFallback(url);
}

// Cheerio + Geminiを使用した分析（フォールバック実装）
async function analyzeWithCheerioFallback(url) {
  try {
    const fetch = require('node-fetch');
    const cheerio = require('cheerio');
    const { analyzeWebsiteContent } = require('./utils/gemini-analyzer');

    // HTMLを取得
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // メタデータ抽出
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') || '';

    // テキストコンテンツを抽出
    $('script, style, nav, footer, aside').remove();
    const textContent = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);

    // Gemini 2.5 Flashで詳細分析
    const analysisResult = await analyzeWebsiteContent({
      title,
      description,
      textContent: textContent.substring(0, 3000)
    }, url);

    if (!analysisResult.success) {
      throw new Error(analysisResult.error || '分析に失敗しました');
    }

    const analysisData = analysisResult.analysis;

    // ヒーロー画像用のプロンプトを優先的に選択
    const heroPrompt = analysisData.suggested_prompts?.find(p => p.type === 'hero');
    const suggestedPrompt = heroPrompt?.prompt ||
                           analysisData.suggested_prompts?.[0]?.prompt ||
                           `${title}ウェブサイト用のプロフェッショナルな${analysisData.industry}ビジネス画像`;

    return {
      success: true,
      url,
      title,
      content: {
        description,
        text_preview: textContent.substring(0, 500)
      },
      industry: analysisData.industry || 'other',
      industry_confidence: analysisData.industry_confidence || 'low',
      content_type: analysisData.content_type || 'hero',
      detected_themes: analysisData.detected_themes || [],
      visual_style: analysisData.visual_style || {},
      target_audience: analysisData.target_audience || 'general',
      key_features: analysisData.key_features || [],
      suggested_prompts: analysisData.suggested_prompts || [],
      suggested_prompt: suggestedPrompt,
      image_recommendations: analysisData.image_recommendations || {}
    };

  } catch (error) {
    logger.error('Cheerio + Gemini analysis error:', error);
    return {
      success: false,
      url,
      error: '分析エラー',
      details: error.message
    };
  }
}
