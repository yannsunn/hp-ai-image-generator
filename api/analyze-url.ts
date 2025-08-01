import type { Request, Response } from 'express';
import type { AnalyzeUrlRequest, AnalyzeUrlResponse, ApiError } from '../types';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import logger from './utils/logger';
import { setCorsHeaders, sendErrorResponse, sendSuccessResponse } from './utils/response-helpers';
import { validateUrl } from './utils/input-validator';
import { rateLimiter } from './utils/rate-limiter';
import { analyzeContent } from './utils/content-analyzer';
import { withErrorHandler } from './utils/global-error-handler';

interface AnalysisResult extends AnalyzeUrlResponse {
  success: boolean;
  error?: string;
  details?: string;
  errorMessage?: string;
}

// URLの安全性検証
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // プロトコル制限
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // 内部ネットワークアクセス防止
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' ||
        hostname.match(/^192\.168\./) ||
        hostname.match(/^10\./) ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// URLからコンテンツを取得して解析
async function analyzeUrl(url: string): Promise<AnalysisResult> {
  try {
    // URLの安全性検証
    if (!isValidUrl(url)) {
      throw new Error('Invalid URL or access to internal network not allowed');
    }
    
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
      
      // プロンプト生成
      const industryPrompts: Record<string, string> = {
        'technology': 'modern tech-focused design with digital elements, clean interfaces, abstract data visualization',
        'healthcare': 'clean medical environment, professional healthcare setting, trust and care atmosphere',
        'education': 'academic environment, learning atmosphere, knowledge and growth themes',
        'finance': 'professional financial setting, trust and security, modern business atmosphere',
        'consulting': 'professional business environment, strategic thinking, corporate excellence',
        'restaurant': 'appetizing food presentation, warm dining atmosphere, culinary excellence',
        'retail': 'attractive product display, shopping environment, consumer-friendly design',
        'manufacturing': 'industrial precision, modern factory setting, quality production',
        'realestate': 'architectural beauty, property showcase, living space visualization',
        'beauty': 'elegant beauty concepts, luxury spa atmosphere, wellness and self-care',
        'travel': 'scenic destinations, adventure themes, vacation atmosphere',
        'legal': 'professional law office, justice themes, trust and integrity'
      };

      const contentTypePrompts: Record<string, string> = {
        'hero': 'impressive hero image, strong visual impact, brand identity showcase',
        'about': 'company culture, team environment, organizational values',
        'service': 'service presentation, professional service delivery, customer-focused',
        'product': 'product showcase, feature highlights, professional presentation',
        'team': 'professional team collaboration, expertise showcase, group dynamics',
        'testimonial': 'customer satisfaction, success stories, trust building',
        'news': 'news and updates presentation, information delivery, modern communication',
        'contact': 'professional contact environment, accessibility, customer service',
        'pricing': 'clear pricing presentation, value proposition, professional layout',
        'faq': 'helpful information delivery, user support, clear communication'
      };

      const basePrompt = industryPrompts[industry] || 'professional business environment, clean modern design';
      const contentPrompt = contentTypePrompts[primaryContentType] || contentTypePrompts['hero'];
      
      const suggestedPrompt = `${basePrompt}, ${contentPrompt}, professional Japanese business style, high quality, modern design`;

      // 画像抽出（TypeScript対応）
      const images: Array<{ src: string; alt?: string }> = [];
      $('img').each((_, element) => {
        const src = $(element).attr('src');
        if (src) {
          images.push({
            src: new URL(src, url).href,
            alt: $(element).attr('alt')
          });
        }
      });

      const result: AnalysisResult = {
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

    } catch (fetchError: any) {
      clearTimeout(timeout);
      logger.error('Fetch error:', fetchError);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - the website took too long to respond');
      }
      throw fetchError;
    }

  } catch (error: any) {
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
        details: 'ウェブサイトへの接続がタイムアウトしました。後でもう一度お試しください。'
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
        error: 'ウェブサイトにアクセスできません',
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
  const rateLimitResult = rateLimiter.checkApiLimit(req, 'analyze-url');
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil(rateLimitResult.timeUntilReset / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    sendErrorResponse(res, 429, 'レート制限に達しました', 
      `1分間に${rateLimitResult.maxRequests}回までのリクエストが可能です。${retryAfter}秒後に再試行してください。`);
    return;
  }

  await analyzeUrlHandler(req, res);
}

export default withErrorHandler(handler);

async function analyzeUrlHandler(req: Request, res: Response): Promise<void> {
  try {
    const { url } = req.body as AnalyzeUrlRequest;
    
    // 入力検証（包括的）
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      sendErrorResponse(res, 400, urlValidation.error || 'Invalid URL');
      return;
    }

    const validatedUrl = urlValidation.sanitized!;

    const result = await analyzeUrl(validatedUrl);
    
    if (result.success) {
      sendSuccessResponse(res, result);
    } else {
      sendErrorResponse(res, 400, result.error || '解析エラー', result.details);
    }

  } catch (error: any) {
    logger.error('API handler error:', error);
    sendErrorResponse(res, 500, `サーバーエラー: ${error.message || 'サーバー側でエラーが発生しました。しばらくしてから再度お試しください。'}`);
  }
}