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
    '8k resolution'
  ];
  
  const japaneseEnhancements = [
    'Japanese people',
    'East Asian features',
    'Japanese business setting',
    'Tokyo office environment'
  ];
  
  // 業界別の追加要素
  const industryEnhancements = {
    'technology': ['modern tech office', 'digital workspace', 'innovative technology environment'],
    'healthcare': ['medical facility', 'healthcare professionals', 'clean medical environment'],
    'education': ['educational setting', 'learning environment', 'academic atmosphere'],
    'finance': ['financial district', 'banking environment', 'corporate finance setting'],
    'consulting': ['consulting office', 'strategic meeting room', 'professional advisory setting'],
    'restaurant': ['restaurant interior', 'culinary environment', 'dining establishment'],
    'retail': ['retail store', 'shopping environment', 'commercial space'],
    'manufacturing': ['modern factory', 'industrial setting', 'production facility'],
    'realestate': ['property showcase', 'real estate office', 'architectural setting']
  };
  
  // コンテンツタイプ別の追加要素
  const contentTypeEnhancements = {
    'hero': ['impressive hero image', 'strong visual impact', 'brand identity showcase'],
    'about': ['company culture', 'organizational values', 'corporate identity'],
    'service': ['service presentation', 'professional service delivery', 'customer-focused'],
    'product': ['product showcase', 'feature highlights', 'professional presentation'],
    'team': ['team collaboration', 'professional teamwork', 'group dynamics'],
    'testimonial': ['customer satisfaction', 'success stories', 'trust building']
  };
  
  // 業界に基づいて追加
  if (context.industry && industryEnhancements[context.industry]) {
    japaneseEnhancements.push(...industryEnhancements[context.industry]);
  }
  
  // コンテンツタイプに基づいて追加
  // 配列形式の新しいcontentTypesをサポート（後方互換性を保持）
  if (context.contentTypes && Array.isArray(context.contentTypes)) {
    context.contentTypes.forEach(type => {
      if (contentTypeEnhancements[type]) {
        japaneseEnhancements.push(...contentTypeEnhancements[type]);
      }
    });
  } else if (context.contentType && contentTypeEnhancements[context.contentType]) {
    // 後方互換性のため単一のcontentTypeもサポート
    japaneseEnhancements.push(...contentTypeEnhancements[context.contentType]);
  }
  
  // ネガティブプロンプトを強化
  const negativePrompt = 'negative prompt: low quality, blurry, distorted faces, bad anatomy, western faces, caucasian features, unrealistic';
  
  const enhancedPrompt = `${prompt}, ${baseEnhancements.join(', ')}, ${japaneseEnhancements.join(', ')}, ${negativePrompt}`;
  
  return enhancedPrompt;
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
      throw new Error('No response parts returned from Gemini API');
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
      throw new Error('No image data returned from Gemini API. Response: ' + JSON.stringify(parts));
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

    if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
      throw new Error('Gemini APIキーが無効です。Vercel環境変数にGEMINI_API_KEYを設定してください。');
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