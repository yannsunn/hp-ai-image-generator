// URLベースの簡易解析（fetchを使わない実装）
export default async function handler(req, res) {
  console.log('analyze-url handler called:', { method: req.method });
  
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

    console.log('Analyzing URL (without fetch):', url);

    // URLから業界を推測
    const urlLower = url.toLowerCase();
    let detectedIndustry = 'general';
    let contentType = 'hero';
    
    // 簡易的な業界判定
    if (urlLower.includes('tech') || urlLower.includes('it') || urlLower.includes('software')) {
      detectedIndustry = 'technology';
    } else if (urlLower.includes('clinic') || urlLower.includes('hospital') || urlLower.includes('medical')) {
      detectedIndustry = 'healthcare';
    } else if (urlLower.includes('school') || urlLower.includes('university') || urlLower.includes('education')) {
      detectedIndustry = 'education';
    } else if (urlLower.includes('bank') || urlLower.includes('finance') || urlLower.includes('insurance')) {
      detectedIndustry = 'finance';
    } else if (urlLower.includes('shop') || urlLower.includes('store') || urlLower.includes('retail')) {
      detectedIndustry = 'retail';
    } else if (urlLower.includes('restaurant') || urlLower.includes('cafe') || urlLower.includes('food')) {
      detectedIndustry = 'restaurant';
    } else if (urlLower.includes('realestate') || urlLower.includes('property') || urlLower.includes('housing')) {
      detectedIndustry = 'realestate';
    } else if (urlLower.includes('beauty') || urlLower.includes('salon') || urlLower.includes('spa')) {
      detectedIndustry = 'beauty';
    } else if (urlLower.includes('travel') || urlLower.includes('hotel') || urlLower.includes('tour')) {
      detectedIndustry = 'travel';
    }

    // URLのパスからコンテンツタイプを推測
    if (urlLower.includes('about')) {
      contentType = 'about';
    } else if (urlLower.includes('product') || urlLower.includes('service')) {
      contentType = 'product';
    } else if (urlLower.includes('contact')) {
      contentType = 'cta';
    } else if (urlLower.includes('team') || urlLower.includes('staff')) {
      contentType = 'team';
    }

    // 業界に基づいたプロンプト生成
    const industryPrompts = {
      'technology': 'モダンでテクノロジーを感じさせるデザイン、デジタル要素、クリーンなインターフェース',
      'healthcare': '清潔感のある医療環境、信頼感のあるプロフェッショナルな雰囲気',
      'education': 'アカデミックな環境、学習の雰囲気、知識と成長のテーマ',
      'finance': 'プロフェッショナルな金融環境、信頼とセキュリティ、モダンなビジネス',
      'retail': '魅力的な商品ディスプレイ、ショッピング環境、消費者に優しいデザイン',
      'restaurant': '食欲をそそる料理のプレゼンテーション、温かいダイニング雰囲気',
      'realestate': '建築美、物件のショーケース、生活空間の視覚化',
      'beauty': 'エレガントな美容コンセプト、高級スパの雰囲気、ウェルネス',
      'travel': '景色の良い目的地、冒険のテーマ、バケーションの雰囲気',
      'general': 'プロフェッショナルで洗練されたビジネスイメージ'
    };

    const contentTypePrompts = {
      'hero': '印象的なヒーローイメージ、強いビジュアルインパクト、ブランドアイデンティティ',
      'product': '製品ショーケース、機能のハイライト、プロフェッショナルなプレゼンテーション',
      'about': '企業文化、チーム環境、組織の価値観',
      'team': 'チームワーク、プロフェッショナルなスタッフ、協力的な環境',
      'cta': 'アクションを促すビジュアル、エンゲージメント、コンバージョン重視',
      'general': '汎用的なビジネスイメージ'
    };

    const basePrompt = industryPrompts[detectedIndustry] || industryPrompts['general'];
    const contentPrompt = contentTypePrompts[contentType] || contentTypePrompts['general'];
    
    const suggestedPrompt = `${basePrompt}、${contentPrompt}、日本のビジネス文化に適したプロフェッショナルな画像`;

    const result = {
      success: true,
      content: {
        title: `${url} の分析結果`,
        description: 'URLから推測された内容に基づいて画像生成プロンプトを作成しました',
        main_content: `業界: ${detectedIndustry}, コンテンツタイプ: ${contentType}`
      },
      suggested_prompt: suggestedPrompt,
      industry: detectedIndustry,
      content_type: contentType,
      style_suggestions: {
        style_keywords: ['プロフェッショナル', 'モダン', '洗練された', '信頼感のある'],
        color_palette: ['ブルー', 'ホワイト', 'グレー'],
        composition: {
          layout: 'バランスの取れた構成',
          focus: '明確な主題',
          aspect: '16:9または4:3'
        }
      },
      analysis_metadata: {
        method: 'url_pattern',
        confidence_score: 'medium'
      }
    };

    console.log('Analysis result:', result);
    return res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);
    
    // 確実にJSONレスポンスを返す
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify({
      error: 'サーバーエラー',
      message: error.message || 'Unknown error occurred'
    }));
  }
}