import OpenAI from 'openai';
import Replicate from 'replicate';
import fetch from 'node-fetch';

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

  if (req.method === 'POST') {
    const { prompt, count = 1, api_keys = {}, context = {}, api: selectedApi = 'auto' } = req.body || {};
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // API選択ロジック
    let apiToUse = selectedApi;
    if (apiToUse === 'auto') {
      if (api_keys.openai) apiToUse = 'openai';
      else if (api_keys.stability) apiToUse = 'stability';
      else if (api_keys.replicate) apiToUse = 'replicate';
      else apiToUse = 'demo';
    }

    const images = [];
    const errors = [];
    let totalCost = 0;
    
    // 各画像を並列で生成
    const generatePromises = [];
    for (let i = 0; i < count; i++) {
      generatePromises.push(generateSingleImage(prompt, apiToUse, api_keys, context, i));
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

    return res.status(200).json({
      success: true,
      images,
      errors,
      total_cost: totalCost,
      summary: {
        requested: count,
        generated: images.filter(img => !img.metadata.error).length,
        failed: errors.length
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// 単一画像を生成
async function generateSingleImage(prompt, apiToUse, apiKeys, context, index) {
  const startTime = Date.now();
  
  try {
    let result;
    switch (apiToUse) {
      case 'openai':
        if (!apiKeys.openai) {
          throw new Error('OpenAI API key is required');
        }
        result = await generateWithOpenAI(prompt, apiKeys.openai, context);
        break;

      case 'stability':
        if (!apiKeys.stability) {
          throw new Error('Stability AI API key is required');
        }
        result = await generateWithStability(prompt, apiKeys.stability, context);
        break;

      case 'replicate':
        if (!apiKeys.replicate) {
          throw new Error('Replicate API token is required');
        }
        result = await generateWithReplicate(prompt, apiKeys.replicate, context);
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
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg${index}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#bg${index})"/>
      <circle cx="256" cy="200" r="60" fill="#6c757d" opacity="0.3"/>
      <rect x="196" y="280" width="120" height="80" rx="10" fill="#495057" opacity="0.4"/>
      <text x="256" y="320" text-anchor="middle" font-family="Arial" font-size="14" fill="#212529">
        デモ画像 ${index + 1}
      </text>
      <text x="256" y="340" text-anchor="middle" font-family="Arial" font-size="10" fill="#6c757d">
        ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}
      </text>
      <text x="256" y="450" text-anchor="middle" font-family="Arial" font-size="8" fill="#adb5bd">
        ${new Date().toLocaleString('ja-JP')}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
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