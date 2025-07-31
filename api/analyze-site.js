const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { URL } = require('url');
const logger = require('./utils/logger');
const { setCorsHeaders, sendErrorResponse, sendSuccessResponse } = require('./utils/response-helpers');

// 既存のキーワード辞書をインポート
const { industryKeywords, contentTypePatterns } = require('./utils/keywords');

// 進捗情報を格納
const progressData = [];

function recordProgress(progress, message) {
  progressData.push({ progress, message, timestamp: Date.now() });
}

// URLの正規化と検証
function normalizeUrl(baseUrl, href) {
  try {
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return null;
    }
    
    const url = new URL(href, baseUrl);
    
    // 同じドメインのURLのみ
    const base = new URL(baseUrl);
    if (url.hostname !== base.hostname) {
      return null;
    }
    
    // 不要なファイルを除外
    const excludeExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.doc', '.docx', '.xls', '.xlsx'];
    if (excludeExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext))) {
      return null;
    }
    
    return url.href;
  } catch {
    return null;
  }
}

// ページ解析関数
async function analyzePage(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Image-Generator/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9'
      }
    });
    
    clearTimeout(timer);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // ページ情報を抽出
    const pageData = {
      url,
      title: $('title').text() || '',
      description: $('meta[name="description"]').attr('content') || '',
      keywords: $('meta[name="keywords"]').attr('content') || '',
      h1: $('h1').map((i, el) => $(el).text()).get(),
      h2: $('h2').map((i, el) => $(el).text()).get(),
      h3: $('h3').map((i, el) => $(el).text()).get(),
      text: $('body').text().replace(/\s+/g, ' ').substring(0, 5000),
      images: $('img').map((i, el) => $(el).attr('alt') || '').get().filter(alt => alt),
      links: []
    };
    
    // 内部リンクを収集
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const normalizedUrl = normalizeUrl(url, href);
      if (normalizedUrl && !pageData.links.includes(normalizedUrl)) {
        pageData.links.push(normalizedUrl);
      }
    });
    
    return pageData;
    
  } catch (error) {
    clearTimeout(timer);
    logger.error(`Failed to analyze ${url}:`, error.message);
    return null;
  }
}

// サイト全体の解析
async function analyzeSite(startUrl) {
  const analyzed = new Set();
  const toAnalyze = [startUrl];
  const pageDataList = [];
  const maxPages = 10; // 最大解析ページ数
  
  // 進捗記録開始
  progressData.length = 0; // クリア
  recordProgress(0, `解析開始: ${startUrl}`);
  
  while (toAnalyze.length > 0 && analyzed.size < maxPages) {
    const url = toAnalyze.shift();
    
    if (analyzed.has(url)) continue;
    analyzed.add(url);
    
    const progress = Math.round((analyzed.size / maxPages) * 100);
    recordProgress(progress, `解析中: ${url}`);
    
    const pageData = await analyzePage(url);
    
    if (pageData) {
      pageDataList.push(pageData);
      
      // 新しいリンクを追加
      for (const link of pageData.links) {
        if (!analyzed.has(link) && !toAnalyze.includes(link)) {
          toAnalyze.push(link);
        }
      }
    }
    
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  recordProgress(100, '解析完了');
  
  // 全ページのデータを統合して分析
  const siteAnalysis = analyzeSiteData(pageDataList);
  
  return {
    ...siteAnalysis,
    pages_analyzed: analyzed.size,
    pages_found: analyzed.size + toAnalyze.length,
    progress_log: progressData
  };
}

// サイトデータの統合分析
function analyzeSiteData(pageDataList) {
  // すべてのテキストを結合
  const allText = pageDataList.map(p => p.text).join(' ').toLowerCase();
  const allTitles = pageDataList.map(p => p.title).join(' ');
  const allH1 = pageDataList.flatMap(p => p.h1).join(' ');
  const allH2 = pageDataList.flatMap(p => p.h2).join(' ');
  const allImages = pageDataList.flatMap(p => p.images);
  
  // 業界分析（より詳細に）
  const industryScores = {};
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    let score = 0;
    const foundKeywords = [];
    
    for (const keyword of keywords) {
      const count = (allText.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      if (count > 0) {
        score += count;
        foundKeywords.push({ keyword, count });
      }
    }
    
    industryScores[industry] = { score, keywords: foundKeywords };
  }
  
  // 最も高いスコアの業界を選択
  const detectedIndustry = Object.entries(industryScores)
    .sort(([, a], [, b]) => b.score - a.score)[0];
  
  // キーテーマの抽出
  const themes = extractThemes(allText, allH1, allH2);
  
  // ビジュアルスタイルの推定
  const visualStyle = determineVisualStyle(allText, allImages);
  
  // 詳細なプロンプト生成
  const detailedPrompt = generateDetailedPrompt(
    detectedIndustry[0],
    themes,
    visualStyle,
    pageDataList[0] // トップページの情報を優先
  );
  
  return {
    industry: detectedIndustry[0],
    industry_confidence: detectedIndustry[1].score > 10 ? 'high' : detectedIndustry[1].score > 5 ? 'medium' : 'low',
    industry_keywords_found: detectedIndustry[1].keywords,
    main_themes: themes,
    visual_style: visualStyle,
    suggested_prompt: detailedPrompt,
    site_structure: {
      total_pages: pageDataList.length,
      page_titles: pageDataList.map(p => ({ url: p.url, title: p.title }))
    }
  };
}

// キーテーマの抽出
function extractThemes(text, h1Text, h2Text) {
  const themes = [];
  
  // よく使われるビジネステーマ
  const themePatterns = {
    'innovation': ['革新', 'イノベーション', '新しい', '最新', '先進'],
    'trust': ['信頼', '安心', '実績', '確かな', '安全'],
    'efficiency': ['効率', '最適化', 'スピード', '迅速', '改善'],
    'cost_reduction': ['コスト削減', '費用対効果', '低価格', '節約', '経済的'],
    'quality': ['品質', 'クオリティ', '高品質', '最高', 'プレミアム'],
    'support': ['サポート', '支援', 'お手伝い', 'フォロー', '相談'],
    'solution': ['ソリューション', '解決', '課題解決', '提案', '改善'],
    'growth': ['成長', '発展', '拡大', '向上', '進化']
  };
  
  for (const [theme, keywords] of Object.entries(themePatterns)) {
    let score = 0;
    for (const keyword of keywords) {
      if (h1Text.includes(keyword)) score += 3;
      if (h2Text.includes(keyword)) score += 2;
      if (text.includes(keyword)) score += 1;
    }
    if (score > 0) {
      themes.push({ theme, score });
    }
  }
  
  return themes.sort((a, b) => b.score - a.score).slice(0, 3).map(t => t.theme);
}

// ビジュアルスタイルの推定
function determineVisualStyle(text, imageAlts) {
  const style = {
    tone: 'professional', // デフォルト
    atmosphere: [],
    color_hints: []
  };
  
  // トーンの判定
  if (text.includes('カジュアル') || text.includes('フレンドリー')) {
    style.tone = 'casual';
  } else if (text.includes('高級') || text.includes('プレミアム')) {
    style.tone = 'luxury';
  } else if (text.includes('テクノロジー') || text.includes('デジタル')) {
    style.tone = 'tech-modern';
  }
  
  // 雰囲気の判定
  if (text.includes('明るい') || text.includes('活気')) {
    style.atmosphere.push('bright');
  }
  if (text.includes('落ち着いた') || text.includes('静か')) {
    style.atmosphere.push('calm');
  }
  if (text.includes('先進的') || text.includes('未来')) {
    style.atmosphere.push('futuristic');
  }
  
  // 色のヒント
  const colorKeywords = {
    'blue': ['青', 'ブルー', '信頼', '安心'],
    'green': ['緑', 'グリーン', 'エコ', '自然'],
    'orange': ['オレンジ', '温かい', '親しみ'],
    'purple': ['紫', 'パープル', '高級', 'プレミアム'],
    'monochrome': ['モノクロ', 'シンプル', 'ミニマル']
  };
  
  for (const [color, keywords] of Object.entries(colorKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      style.color_hints.push(color);
    }
  }
  
  return style;
}

// 詳細なプロンプト生成
function generateDetailedPrompt(industry, themes, visualStyle, topPageData) {
  const prompts = [];
  
  // 業界別の基本プロンプト
  const industryPrompts = {
    'technology': 'cutting-edge technology environment, digital innovation',
    'healthcare': 'professional medical setting, care and trust',
    'education': 'learning environment, knowledge sharing',
    'finance': 'financial district atmosphere, trust and security',
    'consulting': 'strategic business consulting, professional expertise'
    // ... 他の業界
  };
  
  prompts.push(industryPrompts[industry] || 'professional business environment');
  
  // テーマ別の要素
  const themePrompts = {
    'innovation': 'innovative approach, forward-thinking',
    'trust': 'trustworthy atmosphere, reliability',
    'efficiency': 'streamlined processes, optimal performance',
    'cost_reduction': 'value proposition, smart investment',
    'quality': 'premium quality, attention to detail',
    'support': 'customer support excellence, helpful team',
    'solution': 'problem-solving focus, solution-oriented',
    'growth': 'business growth, scaling success'
  };
  
  themes.forEach(theme => {
    if (themePrompts[theme]) {
      prompts.push(themePrompts[theme]);
    }
  });
  
  // ビジュアルスタイル
  prompts.push(`${visualStyle.tone} visual style`);
  if (visualStyle.atmosphere.length > 0) {
    prompts.push(visualStyle.atmosphere.join(' and ') + ' atmosphere');
  }
  
  // 日本のビジネス向け要素
  prompts.push('Japanese business professionals, Tokyo office setting, high quality photography');
  
  return prompts.join(', ');
}

module.exports = async function handler(req, res) {
  
  // Enable CORS
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // GETリクエストもサポート（SSE用）
  const url = req.method === 'GET' ? req.query.url : req.body?.url;
  const detailed = req.method === 'GET' ? req.query.detailed === 'true' : req.body?.detailed;
  
  try {
    
    if (!url) {
      return sendErrorResponse(res, 400, 'URLが指定されていません');
    }
    
    // 詳細解析の場合
    if (detailed) {
      const result = await analyzeSite(url);
      
      return sendSuccessResponse(res, result);
    } else {
      // 簡敩解析（既存の処理）
      const pageData = await analyzePage(url);
      const analysis = analyzeSiteData([pageData]);
      
      return sendSuccessResponse(res, analysis);
    }
    
  } catch (error) {
    logger.error('API handler error:', error);
    return sendErrorResponse(res, 500, error.message || '解析エラー');
  }
};