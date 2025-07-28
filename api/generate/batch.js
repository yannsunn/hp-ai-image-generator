const OpenAI = require('openai');
const Replicate = require('replicate');
const fetch = require('node-fetch');
const { validatePrompt } = require('../utils/validation');

// 日本向けプロンプトの強化
function enhancePromptForJapan(prompt, context = {}) {
  // 日本向けの明確な指示を追加
  const japaneseEnhancements = [
    'Japanese business people',
    'Japanese office environment', 
    'Tokyo modern office',
    'Asian ethnicity',
    'Japanese corporate culture',
    'professional Japanese business style'
  ];
  
  // コンテキストに基づいて追加
  if (context.contentType === 'hero') {
    japaneseEnhancements.push('Japanese business professionals in suits');
  }
  
  // 西洋的な要素を避ける指示
  const avoidTerms = ', avoid Western faces, avoid Caucasian people, Asian people only';
  
  return `${prompt}, ${japaneseEnhancements.join(', ')}${avoidTerms}`;
}

module.exports = async function handler(req, res) {
  console.log('Batch generate handler called:', { method: req.method, url: req.url });
  
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

  // 全体のエラーハンドリング
  try {

  if (req.method === 'POST') {
    console.log('Batch generate request:', req.body);
    
    const { prompt, count = 1, context = {}, api: selectedApi = 'auto' } = req.body || {};
    
    // プロンプトの検証
    const promptValidation = validatePrompt(prompt);
    if (!promptValidation.valid) {
      return res.status(400).json({ error: promptValidation.error });
    }

    if (count > 8) {
      return res.status(400).json({ error: '生成枚数は8枚までです' });
    }

    // API選択ロジック（環境変数ベース）
    let apiToUse = selectedApi.toLowerCase(); // 大文字小文字を正規化
    console.log('API selection:', { selectedApi, apiToUse });
    
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
    
    console.log('Final API to use:', apiToUse);
    console.log('Environment check:', {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasStability: !!process.env.STABILITY_API_KEY,
      hasReplicate: !!process.env.REPLICATE_API_TOKEN
    });

    const images = [];
    const errors = [];
    let totalCost = 0;
    
    // 各画像を並列で生成
    const generatePromises = [];
    for (let i = 0; i < count; i++) {
      generatePromises.push(generateSingleImage(prompt, apiToUse, context, i));
    }
    
    const results = await Promise.allSettled(generatePromises);
    
    // 結果を処理
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        images.push({
          index,
          image: result.value.image,
          metadata: result.value.metadata
        });
        totalCost += result.value.metadata.cost;
      } else {
        console.error(`Image ${index} generation failed:`, {
          reason: result.reason,
          message: result.reason?.message,
          stack: result.reason?.stack,
          apiUsed: apiToUse
        });
        errors.push({
          index,
          error: result.reason.message || 'Generation failed',
          details: result.reason.toString()
        });
        
        // エラー時は何も追加しない - エラーをそのまま伝える
      }
    });

    console.log(`Batch generation completed: ${images.length} images, ${errors.length} errors, $${totalCost.toFixed(4)} cost`);
    
    // エラーがある場合は失敗として処理
    if (errors.length > 0 && images.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'すべての画像生成に失敗しました',
        errors: errors,
        details: errors.map(e => e.details).join(', ')
      });
    }
    
    // Content-Type を明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json({
      success: images.length > 0,
      images,
      errors,
      total_cost: totalCost,
      summary: {
        requested: count,
        generated: images.length,
        failed: errors.length,
        api_used: apiToUse
      }
    });
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(405).json({ error: 'Method not allowed' });
  
  } catch (error) {
    console.error('Batch generate API error:', error);
    
    // 確実にJSONレスポンスを返す
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: 'サーバーエラー',
      details: 'バッチ画像生成中にエラーが発生しました。',
      message: error.message || 'Unknown error occurred'
    });
  }
}

// 単一画像を生成
async function generateSingleImage(prompt, apiToUse, context, index) {
  const startTime = Date.now();
  
  try {
    let result;
    console.log(`Generating image ${index + 1} with ${apiToUse} API`);
    
    switch (apiToUse) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key is not configured');
        }
        const japanesePromptOpenAI = enhancePromptForJapan(prompt, context);
        result = await generateWithOpenAI(japanesePromptOpenAI, process.env.OPENAI_API_KEY, context);
        break;

      case 'stability':
        if (!process.env.STABILITY_API_KEY) {
          throw new Error('Stability AI API key is not configured');
        }
        const japanesePromptStability = enhancePromptForJapan(prompt, context);
        result = await generateWithStability(japanesePromptStability, process.env.STABILITY_API_KEY, context);
        break;

      case 'replicate':
        if (!process.env.REPLICATE_API_TOKEN) {
          throw new Error('Replicate API token is not configured');
        }
        // 日本向けのプロンプトを強化
        const japanesePrompt = enhancePromptForJapan(prompt, context);
        result = await generateWithReplicate(japanesePrompt, process.env.REPLICATE_API_TOKEN, context);
        break;

      default:
        // 無効なAPIが選択された場合
        throw new Error(`無効なAPIが選択されました: ${apiToUse}`);
    }
    
    return {
      image: result.image,
      metadata: {
        original_prompt: prompt,
        enhanced_prompt: prompt + ' - Professional Japanese style',
        api_used: apiToUse,
        cost: result.cost,
        generation_time: Date.now() - startTime,
        resolution: getResolution(apiToUse),
        format: 'PNG/JPEG'
      }
    };
  } catch (error) {
    console.error(`Generation error for image ${index}:`, error);
    throw error;
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
  console.log('Initializing Replicate with token:', apiToken ? 'Token exists' : 'No token');
  const replicate = new Replicate({
    auth: apiToken
  });
  
  try {
    const output = await replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      {
        input: {
          prompt: prompt,
          width: 1024,
          height: 1024,
          num_outputs: 1,
          scheduler: 'K_EULER',
          num_inference_steps: 30,
          guidance_scale: 7.5
        }
      }
    );
    
    console.log('Replicate output:', output);
    
    // Replicateは配列またはURLを返す
    const imageUrl = Array.isArray(output) ? output[0] : output;
    
    if (!imageUrl) {
      throw new Error('No image URL returned from Replicate');
    }
    
    console.log('Fetching image from URL:', imageUrl);
    
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
    throw error;
  }
}

// デモ画像生成関数は削除 - エラー時はエラーを返す

// 解像度を取得
function getResolution(api) {
  switch (api) {
    case 'openai':
      return '1024x1024';
    case 'stability':
    case 'replicate':
      return '1024x1024';
    default:
      return '512x512';
  }
}