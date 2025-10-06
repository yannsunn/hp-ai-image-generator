const fetch = require('node-fetch');
const cheerio = require('cheerio');
const logger = require('./utils/logger');
const { sendErrorResponse } = require('./utils/response-helpers');
const { validateUrl } = require('./utils/input-validator');
const { analyzeContent } = require('./utils/content-analyzer');
const { withErrorHandler } = require('./utils/global-error-handler');
const { withStandardMiddleware } = require('./utils/middleware');

// URLからコンテンツを取得して解析
async function analyzeUrl(url) {
  try {
    
    // HTMLを取得
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15秒でタイムアウト
    
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
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
                         $('meta[property="og:description"]').attr('content') || 
                         $('p').first().text().trim().substring(0, 200) || '';
      
      // テキストコンテンツを抽出
      $('script, style, nav, footer, aside').remove(); // 不要な要素を削除
      const textContent = $('body').text()
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000); // 分析用に最初の5000文字を使用
      
      // 新しいcontent-analyzerを使用
      const analysisResult = analyzeContent(textContent + ' ' + title + ' ' + description, url);
      
      // 結果の構築
      const industry = analysisResult.industry?.industry || '';
      const contentTypes = analysisResult.contentTypes.map(ct => ct.type);
      const primaryContentType = contentTypes[0] || 'hero';

      // 画像の抽出
      const images = [];
      $('img').each((i, element) => {
        if (i >= 10) return false; // 最初の10枚まで
        const src = $(element).attr('src');
        if (src) {
          images.push({
            src: new URL(src, url).href,
            alt: $(element).attr('alt')
          });
        }
      });

      const result = {
        success: true,
        url,
        title: title.substring(0, 100),
        content: {
          mainHeading: title,
          subHeadings: [],
          paragraphs: [description, textContent.substring(0, 500)].filter(Boolean),
          industry,
          contentType: primaryContentType,
          keywords: contentTypes
        },
        images: images.slice(0, 10), // 最初の10枚まで
        analyzedAt: new Date().toISOString()
      };

      return result;

    } catch (fetchError) {
      clearTimeout(timeout);
      logger.error('Fetch error:', fetchError);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - the website took too long to respond');
      }
      throw fetchError;
    }

  } catch (error) {
    logger.error('URL analysis error:', error);
    
    // エラーの種類に応じた適切なレスポンス
    if (error.message.includes('Invalid URL')) {
      return {
        success: false,
        url,
        title: '',
        content: {
          subHeadings: [],
          paragraphs: []
        },
        images: [],
        analyzedAt: new Date().toISOString(),
        error: 'URLの形式が正しくありません',
        details: '正しいURL形式（例: https://example.com）を入力してください'
      };
    } else if (error.message.includes('timeout')) {
      return {
        success: false,
        url,
        title: '',
        content: {
          subHeadings: [],
          paragraphs: []
        },
        images: [],
        analyzedAt: new Date().toISOString(),
        error: 'タイムアウトエラー',
        details: 'ウェブサイトの応答に時間がかかりすぎました。しばらくしてから再度お試しください。'
      };
    } else if (error.message.includes('HTTP error')) {
      return {
        success: false,
        url,
        title: '',
        content: {
          subHeadings: [],
          paragraphs: []
        },
        images: [],
        analyzedAt: new Date().toISOString(),
        error: 'アクセスエラー',
        details: `HTTPステータス: ${error.message}`
      };
    } else {
      return {
        success: false,
        url,
        title: '',
        content: {
          subHeadings: [],
          paragraphs: []
        },
        images: [],
        analyzedAt: new Date().toISOString(),
        error: '解析エラー',
        details: 'ウェブサイトの解析中にエラーが発生しました。別のURLをお試しください。',
        errorMessage: error.message
      };
    }
  }
}

async function handler(req, res) {
  // 標準ミドルウェア適用（CORS、OPTIONS、メソッド検証、レート制限）
  const canProceed = await withStandardMiddleware(req, res, 'analyze-url');
  if (!canProceed) return;

  await analyzeUrlHandler(req, res);
}

module.exports = withErrorHandler(handler);

async function analyzeUrlHandler(req, res) {
  try {
    const { url } = req.body;
    
    // 入力検証（包括的）
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      sendErrorResponse(res, 400, urlValidation.error || 'Invalid URL');
      return;
    }

    const validatedUrl = urlValidation.sanitized;

    const result = await analyzeUrl(validatedUrl);
    
    if (result.success) {
      // 成功レスポンスの構造を整理
      const response = {
        success: true,
        url: result.url,
        title: result.title,
        content: result.content,
        images: result.images,
        analyzedAt: result.analyzedAt,
        // 自動推測された情報を追加
        industry: result.content.industry || '',
        content_type: result.content.contentType || 'hero',
        detected_content_types: result.content.keywords || [],
        suggested_prompt: `${result.content.industry}業界の${result.content.contentType}画像。${result.title}`,
        analysis: {
          industry_confidence: 'medium',
          detected_themes: result.content.keywords || [],
          analysis_method: 'url_content'
        }
      };
      res.status(200).json(response);
    } else {
      sendErrorResponse(res, 400, result.error || '解析エラー', result.details);
    }

  } catch (error) {
    logger.error('API handler error:', error);
    sendErrorResponse(res, 500, `サーバーエラー: ${error.message || 'サーバー側でエラーが発生しました。しばらくしてから再度お試しください。'}`);
  }
}