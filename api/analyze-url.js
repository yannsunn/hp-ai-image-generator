import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// 業界判定用のキーワード辞書
const industryKeywords = {
  'technology': ['テクノロジー', 'IT', 'ソフトウェア', 'システム', 'デジタル', 'AI', '人工知能', 'IoT', 'DX', 'クラウド', 'セキュリティ', 'データ'],
  'healthcare': ['医療', '病院', 'クリニック', '診療', '医師', '看護', '健康', 'ヘルスケア', '薬', '治療', '患者', '医学'],
  'education': ['教育', '学校', '大学', '塾', '学習', '授業', '講座', 'eラーニング', '研修', '資格', '試験', '生徒'],
  'finance': ['金融', '銀行', '保険', '投資', '証券', '資産', 'ローン', '融資', 'ファイナンス', '決済', '為替', '株式'],
  'retail': ['小売', '販売', 'ショップ', '店舗', '通販', 'EC', 'eコマース', '商品', '買い物', 'オンラインストア', 'ショッピング'],
  'restaurant': ['レストラン', '飲食', 'カフェ', '料理', 'フード', 'グルメ', 'ダイニング', 'ランチ', 'ディナー', 'メニュー', '食事'],
  'realestate': ['不動産', '物件', '住宅', 'マンション', '賃貸', '売買', '建築', '建設', 'リフォーム', '住まい', '土地'],
  'beauty': ['美容', 'エステ', 'サロン', 'ヘアサロン', 'ネイル', 'スパ', 'コスメ', '化粧品', 'ビューティー', 'スキンケア', 'メイク'],
  'travel': ['旅行', '観光', 'ホテル', '宿泊', 'ツアー', 'トラベル', '旅館', '観光地', '予約', 'プラン', '温泉'],
  'manufacturing': ['製造', '工場', '生産', 'メーカー', '産業', '工業', '部品', '機械', '設備', '品質', '製品'],
  'consulting': ['コンサルティング', 'コンサル', 'アドバイザー', 'ソリューション', '戦略', '経営', 'ビジネス', '支援', '改善', '効率化'],
  'legal': ['法律', '弁護士', '司法書士', '行政書士', '法務', 'リーガル', '契約', '相談', '訴訟', '法的'],
  'nonprofit': ['NPO', '非営利', 'ボランティア', '社会貢献', '支援', '福祉', '団体', '活動', '寄付', 'チャリティー']
};

// コンテンツタイプ判定用のパターン
const contentTypePatterns = {
  'hero': {
    keywords: ['ヒーロー', 'メインビジュアル', 'トップ', 'ホーム', 'ランディング'],
    indicators: ['h1', '.hero', '#hero', '.main-visual', '.top-visual']
  },
  'product': {
    keywords: ['製品', '商品', 'プロダクト', 'サービス', '機能', '特徴', '価格'],
    indicators: ['.product', '.item', '.service', '.pricing']
  },
  'about': {
    keywords: ['について', '会社概要', '私たち', 'ミッション', 'ビジョン', '理念', '歴史'],
    indicators: ['.about', '#about', '.company', '.mission']
  },
  'feature': {
    keywords: ['特徴', '機能', 'メリット', '強み', 'ポイント', '選ばれる理由'],
    indicators: ['.feature', '.benefit', '.advantage']
  },
  'testimonial': {
    keywords: ['お客様の声', '事例', 'レビュー', '評価', '体験談', '導入事例'],
    indicators: ['.testimonial', '.review', '.case-study']
  },
  'team': {
    keywords: ['チーム', 'スタッフ', 'メンバー', '社員', '組織', '代表'],
    indicators: ['.team', '.staff', '.member']
  },
  'cta': {
    keywords: ['お問い合わせ', '資料請求', '無料相談', '申し込み', '登録', '今すぐ'],
    indicators: ['.cta', '.contact', '.form', 'button']
  }
};

// URLの安全性検証
function isValidUrl(url) {
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
export async function analyzeUrl(url) {
  try {
    // URLの安全性検証
    if (!isValidUrl(url)) {
      throw new Error('Invalid URL or access to internal network not allowed');
    }
    
    const urlObj = new URL(url);
    
    // HTMLを取得（Vercel無料プランの10秒制限に対応）
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8秒でタイムアウト
    
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        size: 2 * 1024 * 1024 // 2MB制限
      });
      
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (fetchError) {
      clearTimeout(timeout);
      throw fetchError;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // メタデータの抽出
    const title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';
    
    // 本文テキストの抽出（スクリプトとスタイルを除外）
    $('script, style').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const allText = `${title} ${description} ${bodyText}`.toLowerCase();

    // 業界の判定
    let detectedIndustry = 'general';
    let maxScore = 0;

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      let score = 0;
      for (const keyword of keywords) {
        if (allText.includes(keyword.toLowerCase())) {
          score++;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        detectedIndustry = industry;
      }
    }

    // コンテンツタイプの判定
    let detectedContentType = 'hero'; // デフォルト
    const isHomePage = urlObj.pathname === '/' || urlObj.pathname === '/index.html';
    
    if (!isHomePage) {
      // ページ構造から判定
      for (const [contentType, pattern] of Object.entries(contentTypePatterns)) {
        let found = false;
        
        // キーワードチェック
        for (const keyword of pattern.keywords) {
          if (allText.includes(keyword)) {
            found = true;
            break;
          }
        }
        
        // DOM要素チェック
        if (!found) {
          for (const indicator of pattern.indicators) {
            if ($(indicator).length > 0) {
              found = true;
              break;
            }
          }
        }
        
        if (found) {
          detectedContentType = contentType;
          break;
        }
      }
    }

    // 画像生成用のプロンプト生成
    const industryPrompts = {
      'technology': 'modern tech-focused design with digital elements, clean interfaces, abstract data visualization',
      'healthcare': 'clean medical environment, professional healthcare setting, trust and care atmosphere',
      'education': 'academic environment, learning atmosphere, knowledge and growth themes',
      'finance': 'professional financial setting, trust and security, modern business atmosphere',
      'retail': 'attractive product display, shopping environment, consumer-friendly design',
      'restaurant': 'appetizing food presentation, warm dining atmosphere, culinary excellence',
      'realestate': 'architectural beauty, property showcase, living space visualization',
      'beauty': 'elegant beauty concepts, luxury spa atmosphere, wellness and self-care',
      'travel': 'scenic destinations, adventure themes, vacation atmosphere',
      'manufacturing': 'industrial precision, modern factory setting, quality production',
      'consulting': 'professional business environment, strategic thinking, corporate excellence',
      'legal': 'professional law office, justice themes, trust and integrity',
      'nonprofit': 'community impact, helping hands, positive social change'
    };

    const contentTypePrompts = {
      'hero': 'impressive hero image, strong visual impact, brand identity showcase',
      'product': 'product showcase, feature highlights, professional presentation',
      'about': 'company culture, team environment, organizational values',
      'feature': 'benefit visualization, feature demonstration, advantage highlights',
      'testimonial': 'customer satisfaction, success stories, trust building',
      'team': 'professional team photo, collaborative environment, expertise showcase',
      'cta': 'action-oriented design, compelling call-to-action, conversion focused'
    };

    const basePrompt = industryPrompts[detectedIndustry] || 'professional business image';
    const contentPrompt = contentTypePrompts[detectedContentType] || 'professional web design';
    
    const suggestedPrompt = `Japanese ${detectedIndustry} industry website ${detectedContentType} section, ${basePrompt}, ${contentPrompt}, modern web design, high quality professional photography style`;

    // 色彩パレットの提案
    const colorPalettes = {
      'technology': ['#0066CC', '#00A8E8', '#003459', '#007EA7', '#FFFFFF'],
      'healthcare': ['#00A8A8', '#4ECDC4', '#F7FFF7', '#1A535C', '#FFFFFF'],
      'education': ['#003F5C', '#58508D', '#BC5090', '#FF6361', '#FFA600'],
      'finance': ['#003366', '#004080', '#0059B3', '#0073E6', '#FFFFFF'],
      'retail': ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
      'restaurant': ['#8B4513', '#D2691E', '#FF6347', '#FFA500', '#F5DEB3'],
      'realestate': ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#ECF0F1'],
      'beauty': ['#FFB6C1', '#FFC0CB', '#E6B8D4', '#DDA0DD', '#FFFFFF'],
      'travel': ['#00CED1', '#48D1CC', '#40E0D0', '#AFEEEE', '#87CEEB'],
      'manufacturing': ['#34495E', '#2C3E50', '#7F8C8D', '#95A5A6', '#BDC3C7'],
      'consulting': ['#1A237E', '#283593', '#3949AB', '#3F51B5', '#FFFFFF'],
      'legal': ['#1B1B1B', '#2C3E50', '#34495E', '#4A4A4A', '#FFFFFF'],
      'nonprofit': ['#27AE60', '#2ECC71', '#16A085', '#1ABC9C', '#FFFFFF']
    };

    const colorPalette = colorPalettes[detectedIndustry] || ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#FFFFFF'];

    return {
      success: true,
      content: {
        title: title.substring(0, 100),
        description: description.substring(0, 200),
        text_preview: bodyText.substring(0, 300) + '...'
      },
      industry: detectedIndustry,
      content_type: detectedContentType,
      suggested_prompt: suggestedPrompt,
      style_suggestions: {
        color_palette: colorPalette,
        style_keywords: ['professional', 'modern', 'clean', 'japanese-aesthetic'],
        composition: {
          layout: detectedContentType === 'hero' ? 'wide panoramic view' : 'focused composition',
          lighting: 'natural soft lighting',
          mood: detectedIndustry === 'technology' ? 'futuristic' : 'warm and inviting'
        }
      },
      metadata: {
        url: url,
        analyzed_at: new Date().toISOString(),
        confidence_score: maxScore > 3 ? 'high' : maxScore > 1 ? 'medium' : 'low'
      }
    };

  } catch (error) {
    console.error('URL analysis error:', error);
    
    // エラーの種類に応じた適切なレスポンス
    if (error.message.includes('Invalid URL')) {
      return {
        success: false,
        error: 'URLの形式が正しくありません',
        details: '正しいURL形式（例: https://example.com）を入力してください'
      };
    } else if (error.message.includes('timeout')) {
      return {
        success: false,
        error: 'タイムアウトエラー',
        details: 'ウェブサイトへの接続がタイムアウトしました。後でもう一度お試しください。'
      };
    } else if (error.message.includes('HTTP error')) {
      return {
        success: false,
        error: 'ウェブサイトにアクセスできません',
        details: `HTTPステータス: ${error.message}`
      };
    } else {
      return {
        success: false,
        error: '解析エラー',
        details: 'ウェブサイトの解析中にエラーが発生しました。別のURLをお試しください。'
      };
    }
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URLが指定されていません' });
    }

    const result = await analyzeUrl(url);
    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'サーバーエラー',
      message: error.message
    });
  }
}