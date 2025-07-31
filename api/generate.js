const OpenAI = require('openai');
const Replicate = require('replicate');
const fetch = require('node-fetch');
const { validatePrompt } = require('./utils/validation');
const { translateInstruction, translateInstructions } = require('./utils/japanese-to-english');

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

module.exports = async function handler(req, res) {
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
    const { prompt, context = {}, api: selectedApi = 'auto', additionalInstructions = [] } = req.body || {};
    
    // プロンプトの検証
    const promptValidation = validatePrompt(prompt);
    if (!promptValidation.valid) {
      return res.status(400).json({ error: promptValidation.error });
    }
    
    // 日本語の追加指示を英語に変換
    const translatedInstructions = translateInstructions(additionalInstructions);
    
    // メインプロンプトと追加指示を結合
    let combinedPrompt = prompt;
    if (translatedInstructions.length > 0) {
      combinedPrompt = `${prompt}, ${translatedInstructions.join(', ')}`;
    }

    // API選択ロジック（環境変数ベース）
    let apiToUse = selectedApi.toLowerCase(); // 大文字小文字を正規化
    
    if (apiToUse === 'auto') {
      if (process.env.OPENAI_API_KEY) apiToUse = 'openai';
      else if (process.env.STABILITY_API_KEY) apiToUse = 'stability';
      else if (process.env.REPLICATE_API_TOKEN) apiToUse = 'replicate';
      else {
        return res.status(500).json({
          success: false,
          error: 'APIキーが設定されていません',
          message: 'Vercelの環境変数にAPIキーを設定してください'
        });
      }
    }
    

    let generatedImage, cost = 0, apiUsed = '';
    const startTime = Date.now();

    try {
      switch (apiToUse) {
        case 'openai':
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
          }
          const result = await generateWithOpenAI(enhancePromptForJapan(combinedPrompt, context), process.env.OPENAI_API_KEY, context);
          generatedImage = result.image;
          cost = result.cost;
          apiUsed = 'openai';
          break;

        case 'stability':
          if (!process.env.STABILITY_API_KEY) {
            throw new Error('Stability AI API key is not configured');
          }
          const stabilityResult = await generateWithStability(enhancePromptForJapan(combinedPrompt, context), process.env.STABILITY_API_KEY, context);
          generatedImage = stabilityResult.image;
          cost = stabilityResult.cost;
          apiUsed = 'stability';
          break;

        case 'replicate':
          if (!process.env.REPLICATE_API_TOKEN) {
            throw new Error('Replicate API token is not configured');
          }
          const replicateResult = await generateWithReplicate(enhancePromptForJapan(combinedPrompt, context), process.env.REPLICATE_API_TOKEN, context);
          generatedImage = replicateResult.image;
          cost = replicateResult.cost;
          apiUsed = 'replicate';
          break;

        default:
          // 無効なAPIが選択された場合
          return res.status(400).json({
            success: false,
            error: '無効なAPIが選択されました',
            available_apis: ['openai', 'stability', 'replicate']
          });
      }
    } catch (apiError) {
      console.error(`API Error (${apiToUse}):`, apiError);
      // エラーをそのまま投げる - デモ画像は使わない
      return res.status(500).json({
        success: false,
        error: '画像生成に失敗しました',
        details: apiError.message,
        api_attempted: apiToUse
      });
    }

    const generationTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      image: generatedImage,
      metadata: {
        original_prompt: prompt,
        enhanced_prompt: prompt + ' - Professional Japanese style',
        api_used: apiUsed,
        cost: cost,
        generation_time: generationTime,
        resolution: 'varies',
        format: 'PNG/JPEG',
        context: context,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Generate API Error:', error);
    return res.status(500).json({
      error: 'サーバーエラー',
      message: error.message
    });
  }
}

// OpenAI DALL-E 3で画像生成
async function generateWithOpenAI(prompt, apiKey, context = {}) {
  const openai = new OpenAI({ apiKey });
  
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url'
    });
    
    // 画像をbase64に変換
    const imageUrl = response.data[0].url;
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.buffer();
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    
    return {
      image: base64Image,
      cost: 0.04 // DALL-E 3 standardの料金
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

// Stability AIで画像生成
async function generateWithStability(prompt, apiKey, context = {}) {
  try {
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [{
          text: prompt,
          weight: 1
        }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30
      })
    });
    
    if (!response.ok) {
      throw new Error(`Stability AI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const base64Image = `data:image/png;base64,${data.artifacts[0].base64}`;
    
    return {
      image: base64Image,
      cost: 0.018 // Stability AI SDXLの料金
    };
  } catch (error) {
    console.error('Stability AI Error:', error);
    throw error;
  }
}

// Replicateで画像生成
async function generateWithReplicate(prompt, apiToken, context = {}) {
  
  const replicate = new Replicate({
    auth: apiToken
  });
  
  try {
    
    // Replicate用のプロンプトを調整
    const replicatePrompt = prompt.replace('negative prompt:', '').substring(0, 500); // プロンプトを短縮
    const negativeMatch = prompt.match(/negative prompt: ([^,]+)/i);
    const negativePrompt = negativeMatch ? negativeMatch[1] : 'low quality, blurry, distorted';
    
    // タイムアウトを短縮して高速化
    const output = await replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      {
        input: {
          prompt: replicatePrompt,
          negative_prompt: negativePrompt,
          width: 1024,
          height: 1024,
          num_outputs: 1,
          scheduler: 'K_EULER_ANCESTRAL', // 高速スケジューラー
          num_inference_steps: 25, // ステップ数を減らして高速化
          guidance_scale: 7.5, // ガイダンスを下げて高速化
          seed: Math.floor(Math.random() * 1000000)
        }
      }
    );
    
    
    // Replicateは配列またはURLを返す
    const imageUrl = Array.isArray(output) ? output[0] : output;
    
    if (!imageUrl) {
      throw new Error('No image URL returned from Replicate');
    }
    
    
    // 画像をbase64に変換
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.buffer();
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    
    return {
      image: base64Image,
      cost: 0.005 // Replicate SDXLの料金
    };
  } catch (error) {
    console.error('Replicate API Error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      status: error.status,
      response: error.response,
      stack: error.stack
    });
    
    // クレジット不足エラーを分かりやすく処理
    if (error.message && error.message.includes('402 Payment Required')) {
      throw new Error('Replicate APIのクレジットが不足しています。https://replicate.com/account/billing でクレジットを購入してください。');
    }
    
    throw error;
  }
}

// デモ画像生成関数は削除 - エラー時はエラーを返す