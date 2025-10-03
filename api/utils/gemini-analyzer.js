const logger = require('./logger');

/**
 * Gemini 2.5 Flashを使用してウェブサイトコンテンツを分析
 */
async function analyzeWebsiteContent(content, url) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash'
    });

    const { title, description, textContent } = content;

    const analysisPrompt = `あなたは日本のウェブサイト分析とAI画像生成のエキスパートです。以下のウェブサイトの内容を詳細に分析してください。

URL: ${url}
タイトル: ${title}
説明: ${description}
コンテンツ（抜粋）: ${textContent}

以下の情報をJSON形式で返してください:
{
  "industry": "業界カテゴリ（technology/healthcare/education/finance/consulting/restaurant/retail/manufacturing/realestate/construction/legal/creative/other）",
  "industry_confidence": "確信度（high/medium/low）",
  "content_type": "主要コンテンツタイプ（hero/about/service/product/team/testimonial/contact/portfolio）",
  "detected_themes": ["検出されたテーマ1", "テーマ2", "テーマ3"],
  "visual_style": {
    "tone": "トーン（professional/friendly/modern/traditional/luxurious/minimalist）",
    "atmosphere": ["雰囲気キーワード1", "雰囲気2", "雰囲気3"],
    "color_hints": ["推奨カラー1", "カラー2", "カラー3"]
  },
  "target_audience": "ターゲット層（corporate/individual/b2b/b2c/general）",
  "key_features": ["サイトの主要な特徴1", "特徴2", "特徴3"],
  "suggested_prompts": [
    {
      "type": "hero",
      "prompt": "ヒーロー画像用の詳細な英語プロンプト（具体的で視覚的に）"
    },
    {
      "type": "service",
      "prompt": "サービス紹介用の詳細な英語プロンプト"
    },
    {
      "type": "about",
      "prompt": "会社紹介用の詳細な英語プロンプト"
    }
  ],
  "image_recommendations": {
    "composition": "推奨構図（centered/rule-of-thirds/symmetrical/dynamic）",
    "lighting": "推奨ライティング（natural/studio/dramatic/soft）",
    "perspective": "推奨視点（eye-level/bird-view/close-up/wide-angle）"
  }
}

重要:
- プロンプトは英語で具体的かつ詳細に記述してください
- 日本のビジネス文化に適した表現を使用してください
- プロフェッショナルで高品質な画像生成を意識してください
- JSONのみを返してください（説明文は不要）`;

    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const responseText = response.text();

    logger.info('Gemini analysis response received');

    // JSONを抽出
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('Invalid Gemini response format:', responseText);
      throw new Error('Invalid Gemini response format');
    }

    const analysisData = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      analysis: analysisData,
      raw_response: responseText
    };

  } catch (error) {
    logger.error('Gemini analysis error:', error);
    return {
      success: false,
      error: error.message,
      fallback: getFallbackAnalysis()
    };
  }
}

/**
 * Gemini 2.5 Flashを使用して画像生成プロンプトを最適化
 */
async function optimizeImagePrompt(basePrompt, context = {}) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return basePrompt;
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash'
    });

    const optimizationPrompt = `あなたはAI画像生成のエキスパートです。以下のプロンプトを、Gemini 2.5 Flash Image（Imagen 2）で最高品質の画像を生成するために最適化してください。

元のプロンプト: ${basePrompt}
業界: ${context.industry || '一般'}
コンテンツタイプ: ${context.contentType || 'hero'}
ターゲット: 日本のビジネス向けホームページ

最適化の要件:
1. 具体的で視覚的な描写を追加
2. プロフェッショナルで高品質な仕上がりを指定
3. 日本のビジネス文化に適した要素を含める
4. ライティング、構図、スタイルを明確に指定
5. 200語以内の英語プロンプト

最適化されたプロンプトのみを返してください（説明は不要）:`;

    const result = await model.generateContent(optimizationPrompt);
    const response = await result.response;
    const optimizedPrompt = response.text().trim();

    logger.info('Prompt optimized by Gemini');

    return optimizedPrompt;

  } catch (error) {
    logger.error('Prompt optimization error:', error);
    return basePrompt;
  }
}

/**
 * フォールバック分析データ
 */
function getFallbackAnalysis() {
  return {
    industry: 'other',
    industry_confidence: 'low',
    content_type: 'hero',
    detected_themes: ['professional', 'business', 'modern'],
    visual_style: {
      tone: 'professional',
      atmosphere: ['clean', 'modern', 'trustworthy'],
      color_hints: ['blue', 'white', 'gray']
    },
    target_audience: 'general',
    key_features: ['professional website'],
    suggested_prompts: [
      {
        type: 'hero',
        prompt: 'Professional Japanese business office, modern corporate environment, clean design, natural lighting, high quality photography, 8k resolution'
      }
    ],
    image_recommendations: {
      composition: 'centered',
      lighting: 'natural',
      perspective: 'eye-level'
    }
  };
}

module.exports = {
  analyzeWebsiteContent,
  optimizeImagePrompt,
  getFallbackAnalysis
};
