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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Generate API called:', req.body);
    const { prompt, context = {}, api: selectedApi = 'auto' } = req.body || {};
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // API選択ロジック（環境変数ベース）
    let apiToUse = selectedApi;
    if (apiToUse === 'auto') {
      if (process.env.OPENAI_API_KEY) apiToUse = 'openai';
      else if (process.env.STABILITY_API_KEY) apiToUse = 'stability';
      else if (process.env.REPLICATE_API_TOKEN) apiToUse = 'replicate';
      else {
        console.log('No API keys found in environment variables');
        apiToUse = 'demo';
      }
    }
    console.log('Selected API:', apiToUse);

    let generatedImage, cost = 0, apiUsed = 'demo';
    const startTime = Date.now();

    try {
      switch (apiToUse) {
        case 'openai':
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
          }
          const result = await generateWithOpenAI(prompt, process.env.OPENAI_API_KEY, context);
          generatedImage = result.image;
          cost = result.cost;
          apiUsed = 'openai';
          break;

        case 'stability':
          if (!process.env.STABILITY_API_KEY) {
            throw new Error('Stability AI API key is not configured');
          }
          const stabilityResult = await generateWithStability(prompt, process.env.STABILITY_API_KEY, context);
          generatedImage = stabilityResult.image;
          cost = stabilityResult.cost;
          apiUsed = 'stability';
          break;

        case 'replicate':
          if (!process.env.REPLICATE_API_TOKEN) {
            throw new Error('Replicate API token is not configured');
          }
          const replicateResult = await generateWithReplicate(prompt, process.env.REPLICATE_API_TOKEN, context);
          generatedImage = replicateResult.image;
          cost = replicateResult.cost;
          apiUsed = 'replicate';
          break;

        default:
          // デモモード
          generatedImage = generateDemoImage(prompt);
          cost = 0;
          apiUsed = 'demo';
      }
    } catch (apiError) {
      console.error(`API Error (${apiToUse}):`, apiError);
      // APIエラー時はデモにフォールバック
      generatedImage = generateDemoImage(prompt);
      cost = 0;
      apiUsed = 'demo (fallback)';
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
function generateDemoImage(prompt) {
  const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#bg)"/>
      <circle cx="256" cy="200" r="60" fill="#6c757d" opacity="0.3"/>
      <rect x="196" y="280" width="120" height="80" rx="10" fill="#495057" opacity="0.4"/>
      <text x="256" y="320" text-anchor="middle" font-family="Arial" font-size="14" fill="#212529">
        デモ画像
      </text>
      <text x="256" y="340" text-anchor="middle" font-family="Arial" font-size="10" fill="#6c757d">
        ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}
      </text>
      <text x="256" y="450" text-anchor="middle" font-family="Arial" font-size="8" fill="#adb5bd">
        ${new Date().toLocaleString('ja-JP')}
      </text>
    </svg>`;
  
  // URLエンコードでBase64を回避
  const encodedSvg = encodeURIComponent(svg);
  return `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
}