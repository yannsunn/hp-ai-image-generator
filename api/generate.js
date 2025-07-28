const OpenAI = require('openai');
const Replicate = require('replicate');
const fetch = require('node-fetch');
const { validatePrompt } = require('./utils/validation');

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
    console.log('Generate API called:', req.body);
    const { prompt, context = {}, api: selectedApi = 'auto' } = req.body || {};
    
    // プロンプトの検証
    const promptValidation = validatePrompt(prompt);
    if (!promptValidation.valid) {
      return res.status(400).json({ error: promptValidation.error });
    }

    // API選択ロジック（環境変数ベース）
    let apiToUse = selectedApi.toLowerCase(); // 大文字小文字を正規化
    console.log('API selection:', { selectedApi, apiToUse });
    
    if (apiToUse === 'auto') {
      if (process.env.OPENAI_API_KEY) apiToUse = 'openai';
      else if (process.env.STABILITY_API_KEY) apiToUse = 'stability';
      else if (process.env.REPLICATE_API_TOKEN) apiToUse = 'replicate';
      else {
        console.log('No API keys found in environment variables');
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

    let generatedImage, cost = 0, apiUsed = 'demo';
    const startTime = Date.now();

    try {
      switch (apiToUse) {
        case 'openai':
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
          }
          const japanesePrompt = enhancePromptForJapan(prompt, context);
          const result = await generateWithOpenAI(japanesePrompt, process.env.OPENAI_API_KEY, context);
          generatedImage = result.image;
          cost = result.cost;
          apiUsed = 'openai';
          break;

        case 'stability':
          if (!process.env.STABILITY_API_KEY) {
            throw new Error('Stability AI API key is not configured');
          }
          const japanesePromptStability = enhancePromptForJapan(prompt, context);
          const stabilityResult = await generateWithStability(japanesePromptStability, process.env.STABILITY_API_KEY, context);
          generatedImage = stabilityResult.image;
          cost = stabilityResult.cost;
          apiUsed = 'stability';
          break;

        case 'replicate':
          if (!process.env.REPLICATE_API_TOKEN) {
            throw new Error('Replicate API token is not configured');
          }
          const japanesePromptReplicate = enhancePromptForJapan(prompt, context);
          const replicateResult = await generateWithReplicate(japanesePromptReplicate, process.env.REPLICATE_API_TOKEN, context);
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
        resolution: apiUsed.includes('demo') ? '512x512' : 'varies',
        format: apiUsed.includes('demo') ? 'SVG (demo)' : 'PNG/JPEG',
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
  console.log('Initializing Replicate with token:', apiToken ? 'Token exists' : 'No token');
  console.log('Token details:', {
    exists: !!apiToken,
    length: apiToken ? apiToken.length : 0,
    prefix: apiToken ? apiToken.substring(0, 10) + '...' : 'none',
    type: typeof apiToken
  });
  
  const replicate = new Replicate({
    auth: apiToken
  });
  
  try {
    console.log('Running Replicate model with prompt:', prompt);
    
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
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      status: error.status,
      response: error.response,
      stack: error.stack
    });
    throw error;
  }
}

// デモ画像生成関数は削除 - エラー時はエラーを返す