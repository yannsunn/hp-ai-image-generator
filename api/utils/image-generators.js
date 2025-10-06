const fetch = require('node-fetch');
const config = require('../config');
const logger = require('./logger');

// 日本向けプロンプトの強化
function enhancePromptForJapan(prompt, context = {}) {

  // 日本向けの明確な指示を追加
  const baseEnhancements = [
    'photorealistic',
    'high quality',
    'professional photography',
    '8k resolution',
    'generic and brand-free',
    'no recognizable brands',
    'no company logos',
    'no trademarks',
    'absolutely no text',
    'absolutely no words',
    'absolutely no letters',
    'absolutely no watermarks',
    'absolutely no captions',
    'absolutely no signage',
    'completely text-free image',
    'clean image without any text overlay',
    'no typography',
    'no written content',
    'no labels',
    'no numbers',
    'no symbols',
    'brand-neutral imagery'
  ];

  // 人物が必要かどうかを判定
  const needsPeople = shouldIncludePeople(context);

  const japaneseEnhancements = [];

  if (needsPeople) {
    // 人物が必要な場合のみ追加
    japaneseEnhancements.push(
      'Japanese people',
      'East Asian features',
      'Japanese business setting',
      'diverse facial features',
      'varied appearances',
      'different individuals',
      'unique faces'
    );
  } else {
    // 人物なしの場合
    japaneseEnhancements.push(
      'professional environment',
      'clean composition',
      'modern aesthetic',
      'business-appropriate imagery',
      'generic objects and spaces',
      'brand-neutral products',
      'unbranded items',
      'no people',
      'no humans',
      'no faces'
    );
  }

  // 既存画像のスタイルを取得
  const existingImages = context.existing_images || context.existingImages;
  const visualStyle = getVisualStyleEnhancements(existingImages, needsPeople);

  // 業界別とコンテンツタイプ別の追加要素を取得
  const industrySpecific = getIndustryEnhancements(context, needsPeople);
  const contentTypeSpecific = getContentTypeEnhancements(context, needsPeople);

  japaneseEnhancements.push(...visualStyle, ...industrySpecific, ...contentTypeSpecific);

  // 会社規模に応じて人数を調整（人物が必要な場合のみ）
  if (needsPeople) {
    const companySizeEnhancements = getCompanySizeEnhancements(context);
    if (companySizeEnhancements.length > 0) {
      japaneseEnhancements.push(...companySizeEnhancements);
    }
  }

  // ネガティブプロンプトを構築（商標・ブランド保護を最優先）
  let negativePrompt = 'negative prompt: low quality, blurry, distorted, bad anatomy, unrealistic';

  // **商標・ブランド除外（最重要）**
  negativePrompt += ', logos, brand logos, company logos, trademarks, brand names, company names, corporate branding';
  negativePrompt += ', Amazon, Google, Apple, Microsoft, Facebook, Meta, Twitter, Instagram, YouTube, Netflix, Tesla, Nike, Adidas';
  negativePrompt += ', McDonald, Starbucks, Coca-Cola, Pepsi, Samsung, Sony, Toyota, Honda, BMW, Mercedes';
  negativePrompt += ', any recognizable brands, any corporate logos, any trademarked symbols, branded products';

  // **テキスト・文字の完全除外**
  negativePrompt += ', text, words, letters, numbers, captions, watermarks, signage, labels, typography, written content';
  negativePrompt += ', any text overlay, any written words, any characters, any symbols, any alphanumeric content';
  negativePrompt += ', UI elements with text, buttons with text, signs with text, packaging with text, screens with text';

  if (needsPeople) {
    // 人物が必要な場合は重複する顔を除外
    negativePrompt += ', duplicate faces, identical people, cloned faces, same person repeated, copy-paste faces, western faces, caucasian features';
  } else {
    // 人物が不要な場合は人物全体を除外
    negativePrompt += ', people, humans, person, faces, crowds, groups of people, any human figures';
  }

  const enhancedPrompt = `${prompt}, ${baseEnhancements.join(', ')}, ${japaneseEnhancements.join(', ')}, ${negativePrompt}`;

  return enhancedPrompt;
}

// 既存画像のビジュアルスタイルに基づくプロンプト強化
function getVisualStyleEnhancements(existingImages, needsPeople) {
  const enhancements = [];

  if (!existingImages) {
    return enhancements;
  }

  const primaryStyle = existingImages.primary_image_style;
  const visualTone = existingImages.visual_tone;
  const isStartupStyle = existingImages.is_startup_style;

  // スタートアップスタイル: モダン、ミニマル、グラデーション
  if (isStartupStyle === true || visualTone === 'startup-like') {
    enhancements.push(
      'modern minimalist design',
      'clean aesthetic',
      'soft gradients',
      'pastel color palette',
      'abstract shapes',
      'geometric patterns',
      'contemporary style',
      'startup-inspired visuals',
      'trendy design',
      'sleek and modern'
    );
    return enhancements;
  }

  // イラストスタイル
  if (primaryStyle === 'illustration') {
    enhancements.push(
      'professional illustration',
      'vector graphics',
      'flat design',
      'illustrated elements',
      'graphic design style',
      'clean line art',
      'modern illustration aesthetic'
    );
    return enhancements;
  }

  // 3Dスタイル
  if (primaryStyle === '3d') {
    enhancements.push(
      '3D rendered graphics',
      'three-dimensional design',
      'modern 3D aesthetic',
      'clean 3D modeling',
      'contemporary 3D visualization',
      'stylized 3D elements',
      'smooth 3D surfaces'
    );
    return enhancements;
  }

  // 抽象的スタイル
  if (primaryStyle === 'abstract') {
    enhancements.push(
      'abstract composition',
      'artistic abstraction',
      'conceptual imagery',
      'non-representational design',
      'modern abstract art',
      'geometric abstraction',
      'minimal abstract elements'
    );
    return enhancements;
  }

  // ミニマリストスタイル
  if (primaryStyle === 'minimalist') {
    enhancements.push(
      'minimalist design',
      'clean and simple',
      'minimal elements',
      'uncluttered composition',
      'negative space',
      'essential simplicity',
      'refined minimalism'
    );
    return enhancements;
  }

  // グラデーションスタイル
  if (primaryStyle === 'gradient') {
    enhancements.push(
      'gradient backgrounds',
      'smooth color transitions',
      'modern gradient design',
      'colorful gradients',
      'vibrant color blends',
      'soft gradient overlay',
      'contemporary gradient aesthetic'
    );
    return enhancements;
  }

  // 写真スタイル（リアル写真）
  if (primaryStyle === 'photo') {
    if (!needsPeople) {
      enhancements.push(
        'professional product photography',
        'generic unbranded items',
        'brand-neutral photography',
        'architectural photography',
        'interior design photography',
        'still life photography',
        'environmental photography',
        'workplace photography without people',
        'object-focused composition',
        'no visible logos or brands'
      );
    }
    return enhancements;
  }

  // その他・混合スタイル
  if (visualTone === 'modern') {
    enhancements.push(
      'modern design aesthetic',
      'contemporary style',
      'clean modern look'
    );
  } else if (visualTone === 'professional') {
    enhancements.push(
      'professional quality',
      'business-appropriate imagery',
      'corporate aesthetic'
    );
  } else if (visualTone === 'casual') {
    enhancements.push(
      'casual and approachable',
      'friendly atmosphere',
      'relaxed style'
    );
  }

  return enhancements;
}

// 人物が必要かどうかを判定
function shouldIncludePeople(context) {
  const contentType = context.contentType || context.contentTypes?.[0] || 'hero';
  const industry = context.industry || 'other';
  const existingImages = context.existing_images || context.existingImages;

  // **最優先**: 既存画像の分析結果を確認
  if (existingImages) {
    // スタートアップスタイルの場合は人物なし
    if (existingImages.is_startup_style === true || existingImages.visual_tone === 'startup-like') {
      return false;
    }

    // イラスト、3D、抽象的なスタイルの場合は人物なし
    const noPeopleStyles = ['illustration', '3d', 'abstract', 'minimalist', 'gradient'];
    if (noPeopleStyles.includes(existingImages.primary_image_style)) {
      return false;
    }

    // 既存の人物写真が少ない（30%未満）場合は人物なし
    if (existingImages.people_photo_percentage !== null && existingImages.people_photo_percentage < 30) {
      return false;
    }

    // 既存画像に人物がいない場合は人物なし
    if (existingImages.has_people_photos === false) {
      return false;
    }
  }

  // コンテンツタイプ別の判定
  const peopleRequiredTypes = ['team', 'testimonial']; // aboutを削除
  const peopleNotRequiredTypes = ['product', 'contact', 'portfolio', 'hero', 'service']; // hero, serviceを追加

  // team と testimonial のみ人が必要
  if (peopleRequiredTypes.includes(contentType)) {
    // ただし、既存画像に人がいない場合は人なし
    if (existingImages && existingImages.has_people_photos === false) {
      return false;
    }
    return true;
  }

  // その他は基本的に人なし
  if (peopleNotRequiredTypes.includes(contentType)) {
    return false;
  }

  // about は既存画像に人がいる場合のみ
  if (contentType === 'about') {
    if (existingImages && existingImages.has_people_photos === true && existingImages.people_photo_percentage >= 30) {
      return true;
    }
    return false;
  }

  // デフォルト: 人なし
  return false;
}

// 会社規模のプロンプトを取得
function getCompanySizeEnhancements(context) {
  const companySizeEnhancements = [];

  if (context.companySize) {
    switch (context.companySize) {
      case 'solo':
      case 'individual':
        companySizeEnhancements.push('single Japanese business person', 'solo professional', 'one person only', 'individual entrepreneur');
        break;
      case 'small':
        companySizeEnhancements.push('small Japanese team of maximum 2-3 people', 'intimate group', 'minimal team', 'each person with distinct features');
        break;
      case 'medium':
        companySizeEnhancements.push('Japanese business team of maximum 4-5 people', 'small diverse team', 'varied facial features', 'limited number of individuals');
        break;
      case 'large':
        companySizeEnhancements.push('Japanese business team of maximum 6-8 people', 'moderate corporate group', 'diverse individuals', 'controlled group size');
        break;
    }
  } else if (context.employeeCount) {
    const count = Math.min(parseInt(context.employeeCount), 8); // 最大8人に制限
    if (count === 1) {
      companySizeEnhancements.push('single Japanese business person', 'solo professional', 'one person only');
    } else if (count <= 3) {
      companySizeEnhancements.push(`exactly ${count} Japanese people maximum`, 'small team', 'each person with distinct unique features');
    } else if (count <= 5) {
      companySizeEnhancements.push(`group of maximum ${count} Japanese people`, 'small diverse team', 'varied appearances');
    } else {
      companySizeEnhancements.push(`Japanese business team of maximum ${count} people`, 'moderate group', 'diverse individuals');
    }
  } else {
    // デフォルト: 従業員数不明の場合は1-2人
    companySizeEnhancements.push('single Japanese business person or duo of 2 people maximum', 'minimal number of people', 'solo or small team', 'one or two professionals only');
  }

  return companySizeEnhancements;
}

// 業界別の追加要素を取得
function getIndustryEnhancements(context, needsPeople) {
  const industry = context.industry || 'other';
  const enhancements = [];

  const industrySettings = {
    'technology': {
      withPeople: ['modern tech office', 'digital workspace', 'innovative technology environment', 'generic tech setting'],
      withoutPeople: ['modern tech office', 'generic digital devices', 'unbranded technology products', 'minimal workspace setup', 'clean computer workspace', 'brand-neutral tech equipment']
    },
    'healthcare': {
      withPeople: ['medical facility', 'healthcare professionals', 'clean medical environment'],
      withoutPeople: ['medical facility', 'healthcare equipment', 'clean medical environment', 'hospital interior', 'medical instruments']
    },
    'education': {
      withPeople: ['educational setting', 'learning environment', 'academic atmosphere'],
      withoutPeople: ['educational materials', 'classroom interior', 'learning resources', 'academic environment']
    },
    'finance': {
      withPeople: ['financial district', 'banking environment', 'corporate finance setting'],
      withoutPeople: ['financial district', 'modern office interior', 'corporate workspace', 'business environment']
    },
    'consulting': {
      withPeople: ['consulting office', 'strategic meeting room', 'professional advisory setting'],
      withoutPeople: ['consulting office interior', 'professional workspace', 'modern meeting room', 'business environment']
    },
    'restaurant': {
      withPeople: ['restaurant interior', 'culinary environment', 'dining establishment', 'generic dining space'],
      withoutPeople: ['restaurant interior', 'generic food presentation', 'unbranded culinary dishes', 'clean dining ambiance', 'simple table setting', 'brand-neutral tableware']
    },
    'retail': {
      withPeople: ['retail store', 'shopping environment', 'commercial space', 'generic retail setting'],
      withoutPeople: ['retail store interior', 'generic product display', 'unbranded merchandise', 'clean shopping environment', 'brand-neutral products']
    },
    'manufacturing': {
      withPeople: ['modern factory', 'industrial setting', 'production facility'],
      withoutPeople: ['modern factory', 'industrial equipment', 'production facility', 'manufacturing machinery', 'product assembly']
    },
    'realestate': {
      withPeople: ['property showcase', 'real estate office', 'architectural setting'],
      withoutPeople: ['property showcase', 'architectural design', 'building exterior', 'interior space', 'real estate property']
    }
  };

  if (industrySettings[industry]) {
    const settings = needsPeople ? industrySettings[industry].withPeople : industrySettings[industry].withoutPeople;
    enhancements.push(...settings);
  } else {
    // その他の業界
    if (needsPeople) {
      enhancements.push('professional business setting', 'corporate environment');
    } else {
      enhancements.push('professional workspace', 'modern office interior', 'business environment');
    }
  }

  return enhancements;
}

// コンテンツタイプ別の追加要素を取得
function getContentTypeEnhancements(context, needsPeople) {
  const contentType = context.contentType || context.contentTypes?.[0] || 'hero';
  const enhancements = [];

  const contentTypeSettings = {
    'hero': {
      withPeople: ['impressive hero image', 'strong visual impact', 'brand identity showcase', 'professional presence'],
      withoutPeople: ['impressive hero image', 'strong visual impact', 'brand identity showcase', 'professional atmosphere', 'clean design']
    },
    'about': {
      withPeople: ['company culture', 'organizational values', 'corporate identity', 'team spirit'],
      withoutPeople: ['company culture', 'organizational values', 'corporate identity', 'office environment', 'workspace aesthetic']
    },
    'service': {
      withPeople: ['service presentation', 'professional service delivery', 'customer-focused'],
      withoutPeople: ['service presentation', 'professional showcase', 'solution-focused', 'service visualization']
    },
    'product': {
      withPeople: ['generic product showcase', 'feature highlights', 'professional presentation', 'unbranded product'],
      withoutPeople: ['generic product showcase', 'unbranded product display', 'brand-neutral items', 'professional presentation', 'product-focused', 'clean product display', 'no logos on products']
    },
    'team': {
      withPeople: ['team collaboration', 'professional teamwork', 'group dynamics', 'collaborative spirit'],
      withoutPeople: ['team workspace', 'collaborative environment', 'office setting', 'meeting space']
    },
    'testimonial': {
      withPeople: ['customer satisfaction', 'success stories', 'trust building', 'authentic testimonial'],
      withoutPeople: ['success showcase', 'achievement display', 'trust building', 'results presentation']
    },
    'contact': {
      withPeople: ['welcoming environment', 'accessible location', 'professional reception'],
      withoutPeople: ['office building', 'business location', 'professional entrance', 'company premises', 'welcoming reception area']
    },
    'portfolio': {
      withPeople: ['project showcase', 'work presentation', 'professional achievements'],
      withoutPeople: ['project showcase', 'work samples', 'portfolio display', 'professional achievements', 'completed works']
    }
  };

  if (contentTypeSettings[contentType]) {
    const settings = needsPeople ? contentTypeSettings[contentType].withPeople : contentTypeSettings[contentType].withoutPeople;
    enhancements.push(...settings);
  } else {
    if (needsPeople) {
      enhancements.push('professional presentation', 'business context');
    } else {
      enhancements.push('professional presentation', 'clean composition', 'business environment');
    }
  }

  return enhancements;
}

// Gemini 2.5 Flash Imageで画像生成 (Nano Banana)
async function generateWithGemini(prompt, apiKey, context = {}) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    logger.info('Gemini 2.5 Flash Image generation with prompt:', prompt);

    // Gemini 2.5 Flash Image モデルを使用
    const modelName = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
    const model = genAI.getGenerativeModel({
      model: modelName
    });

    // 画像生成リクエスト
    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Gemini APIレスポンスから画像データを抽出
    const parts = response.candidates?.[0]?.content?.parts;

    if (!parts || parts.length === 0) {
      throw new Error('Gemini APIからレスポンスが返されませんでした');
    }

    // 画像データを探す（inline_dataまたはinlineData形式）
    let imageData = null;
    for (const part of parts) {
      if (part.inlineData || part.inline_data) {
        imageData = part.inlineData || part.inline_data;
        break;
      }
    }

    if (!imageData || !imageData.data) {
      throw new Error('Gemini APIから画像データが返されませんでした。レスポンス: ' + JSON.stringify(parts));
    }

    // MIMEタイプとデータを取得
    const mimeType = imageData.mimeType || imageData.mime_type || 'image/png';
    const base64Data = imageData.data;
    const base64Image = `data:${mimeType};base64,${base64Data}`;

    return {
      image: base64Image,
      cost: 0.039, // Gemini 2.5 Flash Image: $0.039/画像 (1290トークン)
      prompt: prompt,
      analysis: {
        model: modelName,
        tokens: 1290 // 1画像 = 1290トークン
      }
    };

  } catch (error) {
    logger.error('Gemini API Error:', error);

    if (error.message?.includes('API key') || error.message?.includes('API_KEY') || error.message?.includes('authentication_error') || error.message?.includes('OAuth token has expired')) {
      throw new Error('Gemini APIキーが無効または期限切れです。新しいAPIキーを取得して環境変数を更新してください。');
    }

    if (error.message?.includes('not found') || error.message?.includes('models/')) {
      throw new Error(`Gemini モデルが見つかりません: ${process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'}。正しいモデル名を確認してください。`);
    }

    throw error;
  }
}


// 解像度を取得
function getResolution(api) {
  switch (api) {
    case 'gemini':
      return '1024x1024';
    default:
      return '1024x1024';
  }
}

module.exports = {
  enhancePromptForJapan,
  generateWithGemini,
  getResolution
};