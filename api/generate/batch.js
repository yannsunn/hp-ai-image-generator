const OpenAI = require('openai');
const Replicate = require('replicate');
const fetch = require('node-fetch');

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
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
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
      else apiToUse = 'demo';
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
        console.error(`Image ${index} generation failed:`, result.reason);
        errors.push({
          index,
          error: result.reason.message || 'Generation failed'
        });
        
        // エラー時はデモ画像を追加
        images.push({
          index,
          image: generateDemoImage(prompt, index),
          metadata: {
            original_prompt: prompt,
            enhanced_prompt: prompt + ' - Professional Japanese style',
            api_used: 'demo (error fallback)',
            cost: 0,
            error: result.reason.message
          }
        });
      }
    });

    console.log(`Batch generation completed: ${images.length} images, ${errors.length} errors, $${totalCost.toFixed(4)} cost`);
    
    // Content-Type を明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json({
      success: true,
      images,
      errors,
      total_cost: totalCost,
      summary: {
        requested: count,
        generated: images.filter(img => !img.metadata.error).length,
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
        result = await generateWithOpenAI(prompt, process.env.OPENAI_API_KEY, context);
        break;

      case 'stability':
        if (!process.env.STABILITY_API_KEY) {
          throw new Error('Stability AI API key is not configured');
        }
        result = await generateWithStability(prompt, process.env.STABILITY_API_KEY, context);
        break;

      case 'replicate':
        if (!process.env.REPLICATE_API_TOKEN) {
          throw new Error('Replicate API token is not configured');
        }
        result = await generateWithReplicate(prompt, process.env.REPLICATE_API_TOKEN, context);
        break;

      default:
        // デモモード
        return {
          image: generateDemoImage(prompt, index),
          metadata: {
            original_prompt: prompt,
            enhanced_prompt: prompt + ' - Professional Japanese style',
            api_used: 'demo',
            cost: 0,
            generation_time: Date.now() - startTime
          }
        };
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
  const replicate = new Replicate({ auth: apiToken });
  
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
    
    // Replicateは直接URLを返すため、base64に変換
    const imageResponse = await fetch(output[0]);
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

// デモ画像生成
function generateDemoImage(prompt, index = 0) {
  try {
    const colors = [
      { bg1: '#e3f2fd', bg2: '#bbdefb', main: '#2196f3', accent: '#1976d2' },
      { bg1: '#f3e5f5', bg2: '#e1bee7', main: '#9c27b0', accent: '#7b1fa2' },
      { bg1: '#e8f5e9', bg2: '#c8e6c9', main: '#4caf50', accent: '#388e3c' },
      { bg1: '#fff3e0', bg2: '#ffe0b2', main: '#ff9800', accent: '#f57c00' },
      { bg1: '#fce4ec', bg2: '#f8bbd0', main: '#e91e63', accent: '#c2185b' },
      { bg1: '#e0f2f1', bg2: '#b2dfdb', main: '#009688', accent: '#00796b' },
      { bg1: '#f1f8e9', bg2: '#dcedc8', main: '#8bc34a', accent: '#689f38' },
      { bg1: '#ede7f6', bg2: '#d1c4e9', main: '#673ab7', accent: '#512da8' }
    ];
    
    const colorScheme = colors[index % colors.length];
    
    const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg${index}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colorScheme.bg1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorScheme.bg2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#bg${index})"/>
      <circle cx="256" cy="180" r="50" fill="${colorScheme.main}" opacity="0.7"/>
      <rect x="206" y="250" width="100" height="60" rx="10" fill="${colorScheme.accent}" opacity="0.8"/>
      <text x="256" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#ffffff">
        デモ画像 ${index + 1}
      </text>
      <text x="256" y="350" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="${colorScheme.accent}">
        ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}
      </text>
      <text x="256" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#666666">
        ${new Date().toLocaleString('ja-JP')}
      </text>
    </svg>`;
    
    // URLエンコードでBase64を回避
    const encodedSvg = encodeURIComponent(svg);
    return `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  } catch (error) {
    console.error(`Error generating demo image ${index}:`, error);
    // フォールバックとして最小限のSVG
    const fallbackSvg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="#f0f0f0"/><text x="256" y="256" text-anchor="middle" font-family="Arial" font-size="20" fill="#999">Demo ${index + 1}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fallbackSvg)}`;
  }
}

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