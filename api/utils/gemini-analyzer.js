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
  "company_info": {
    "employee_count": 従業員数（数値、不明な場合はnull）,
    "company_size": "会社規模（solo/small/medium/large）",
    "size_confidence": "規模判定の確信度（high/medium/low）",
    "size_indicators": ["規模を判断した根拠1", "根拠2"]
  },
  "existing_images": {
    "has_people_photos": false,
    "people_photo_percentage": 0,
    "primary_image_style": "minimalist",
    "visual_tone": "startup-like",
    "is_startup_style": true,
    "detected_image_types": ["テキスト分析のため推測"]
  },
  "suggested_prompts": [
    {
      "type": "hero",
      "prompt": "ヒーロー画像用の詳細な英語プロンプト（人物なし、モダンでミニマルなスタイル優先）"
    },
    {
      "type": "service",
      "prompt": "サービス紹介用の詳細な英語プロンプト（人物なし優先）"
    },
    {
      "type": "about",
      "prompt": "会社紹介用の詳細な英語プロンプト（人物は最小限）"
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
- 従業員数の判定について（重要）:
  * コンテンツから従業員数の明示的な記載を探してください（「従業員数」「社員数」「スタッフ数」など）
  * チーム紹介ページやメンバー紹介がある場合、その人数を正確にカウントしてください
  * 「代表」「個人事業主」「フリーランス」「一人社長」などの記述があれば solo (1人)
  * 「小規模」「少数精鋭」「2-5名」などの記述があれば small (2-5人)
  * 「中規模」「6-20名」などの記述があれば medium (6-20人)
  * 「大企業」「100名以上」などの記述があれば large (20名以上)
  * **重要**: 明確な証拠がない限り、デフォルトは solo (1人) にしてください
  * confidence が low の場合は必ず solo にしてください
  * 過大評価しないでください。不明な場合は少なめに見積もってください
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
 * Gemini 2.5 Flashを使用してウェブサイトを視覚的に分析（マルチモーダル）
 * Phase 2: スクリーンショット + テキストコンテンツの統合分析
 */
async function analyzeWebsiteVisually(content, screenshotBase64, url) {
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

    // スクリーンショットからBase64データを抽出
    let imageData = screenshotBase64;
    if (screenshotBase64.startsWith('data:image')) {
      imageData = screenshotBase64.split(',')[1];
    }

    const analysisPrompt = `あなたは日本のウェブサイト分析とAI画像生成のエキスパートです。提供されたウェブサイトのスクリーンショットとコンテンツを詳細に分析してください。

URL: ${url}
タイトル: ${title}
説明: ${description}
テキストコンテンツ: ${textContent}

スクリーンショットを詳細に分析して、以下の情報を抽出してください:

**デザイン分析（重要）:**
- 実際に使用されているカラースキーム
- デザインスタイル（モダン、ミニマル、伝統的など）
- レイアウトとビジュアル階層
- UI/UXデザインの特徴

**既存画像の詳細分析（非常に重要）:**
- 既存の画像に人物が写っているか（yes/no）
- 人物写真の割合（0-100%）
- 画像のスタイル（photo/illustration/3d/abstract/minimalist/mixed）
- 画像の雰囲気（professional/casual/modern/traditional/startup-like）
- 海外スタートアップのようなモダンでミニマルなデザインか（yes/no）

**従業員情報:**
- チームページや会社紹介に表示されている人数

以下の情報をJSON形式で返してください:
{
  "industry": "業界カテゴリ（technology/healthcare/education/finance/consulting/restaurant/retail/manufacturing/realestate/construction/legal/creative/other）",
  "industry_confidence": "確信度（high/medium/low）",
  "content_type": "主要コンテンツタイプ（hero/about/service/product/team/testimonial/contact/portfolio）",
  "detected_themes": ["検出されたテーマ1", "テーマ2", "テーマ3"],
  "visual_style": {
    "tone": "トーン（professional/friendly/modern/traditional/luxurious/minimalist）",
    "atmosphere": ["雰囲気キーワード1", "雰囲気2", "雰囲気3"],
    "color_hints": ["実際に使用されているカラー1", "カラー2", "カラー3"],
    "design_style": "デザインスタイルの詳細説明"
  },
  "target_audience": "ターゲット層（corporate/individual/b2b/b2c/general）",
  "key_features": ["サイトの主要な特徴1", "特徴2", "特徴3"],
  "company_info": {
    "employee_count": 従業員数（数値、不明な場合はnull）,
    "company_size": "会社規模（solo/small/medium/large）",
    "size_confidence": "規模判定の確信度（high/medium/low）",
    "size_indicators": ["規模を判断した根拠1", "根拠2"]
  },
  "visual_analysis": {
    "color_scheme": "実際のカラースキームの詳細",
    "layout_style": "レイアウトの特徴",
    "image_style": "既存画像のスタイル（photo/illustration/3d/abstract/minimalist/mixed）",
    "ui_elements": "特徴的なUI要素"
  },
  "existing_images": {
    "has_people_photos": "既存画像に人物が含まれているか（true/false）",
    "people_photo_percentage": 人物写真の割合（0-100の数値）,
    "primary_image_style": "主要な画像スタイル（photo/illustration/3d/abstract/minimalist/gradient/mixed）",
    "visual_tone": "ビジュアルの雰囲気（professional/casual/modern/traditional/startup-like/corporate）",
    "is_startup_style": "海外スタートアップのようなモダンでミニマルなデザインか（true/false）",
    "detected_image_types": ["検出された画像の種類1（例: product photos, office photos, illustrations, icons）", "種類2"]
  },
  "suggested_prompts": [
    {
      "type": "hero",
      "prompt": "既存のビジュアルスタイルに合わせたヒーロー画像用の詳細な英語プロンプト"
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
    "perspective": "推奨視点（eye-level/bird-view/close-up/wide-angle）",
    "style_match": "既存デザインとの調和のための推奨事項"
  }
}

重要:
- スクリーンショットから実際のデザイン要素を詳しく分析してください
- **既存画像分析が最優先**: 既存のホームページに使用されている画像スタイルを正確に把握してください
- **人物判定のルール**:
  * 既存画像に人物写真が少ない（30%未満）場合: 生成画像も人物なしを推奨
  * 既存画像が主にイラスト/3D/抽象的な場合: 同じスタイルを推奨
  * スタートアップスタイルの場合: ミニマル、グラデーション、3D、イラストを優先
  * **デフォルト**: 明確な証拠がない限り人物なしを推奨
- プロンプトは既存のビジュアルスタイルと完全に調和するように最適化してください
- 英語で具体的かつ詳細に記述してください
- 日本のビジネス文化に適した表現を使用してください
- 従業員数の判定について（重要）:
  * スクリーンショットとテキストから従業員数の明示的な記載を探してください
  * チーム紹介ページやメンバー写真がある場合、その人数を正確にカウントしてください
  * 「代表」「個人事業主」「フリーランス」「一人社長」などの記述があれば solo (1人)
  * 「小規模」「少数精鋭」「2-5名」またはチーム写真が2-5人なら small (2-5人)
  * 「中規模」「6-20名」またはチーム写真が6-20人なら medium (6-20人)
  * 「大企業」「100名以上」またはチーム写真が20名以上なら large (20名以上)
  * **重要**: 明確な証拠がない限り、デフォルトは solo (1人) にしてください
  * confidence が low の場合は必ず solo にしてください
  * 過大評価しないでください。不明な場合は少なめに見積もってください
- JSONのみを返してください（説明文は不要）`;

    // マルチモーダル分析: テキスト + 画像
    const result = await model.generateContent([
      { text: analysisPrompt },
      {
        inlineData: {
          mimeType: 'image/png',
          data: imageData
        }
      }
    ]);

    const response = await result.response;
    const responseText = response.text();

    logger.info('Gemini multimodal visual analysis response received');

    // JSONを抽出
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('Invalid Gemini visual analysis response format:', responseText);
      throw new Error('Invalid Gemini response format');
    }

    const analysisData = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      analysis: analysisData,
      raw_response: responseText,
      method: 'gemini-multimodal'
    };

  } catch (error) {
    logger.error('Gemini visual analysis error:', error);
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
    company_info: {
      employee_count: 1,
      company_size: 'solo',
      size_confidence: 'low',
      size_indicators: ['No employee information detected - defaulting to solo entrepreneur']
    },
    existing_images: {
      has_people_photos: false,
      people_photo_percentage: 0,
      primary_image_style: 'minimalist',
      visual_tone: 'startup-like',
      is_startup_style: true,
      detected_image_types: ['Unknown - no screenshot available']
    },
    suggested_prompts: [
      {
        type: 'hero',
        prompt: 'Modern minimalist design, clean aesthetic, soft gradients, abstract shapes, professional business environment, no people, no humans, contemporary style, startup-inspired visuals, high quality, 8k resolution'
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
  analyzeWebsiteVisually,
  optimizeImagePrompt,
  getFallbackAnalysis
};
