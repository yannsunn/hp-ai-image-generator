import OpenAI from 'openai';
import Replicate from 'replicate';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { method, url, query } = req;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Extract the path from the query parameter
    const path = query?.path || url || '';
    console.log('API Request:', { method, path, body: req.body });

    // Health check endpoint
    if (path === 'health' || path === '' || path === '/') {
      return res.status(200).json({
        status: 'healthy',
        message: 'API is running',
        endpoints: ['/api/health', '/api/apis/available', '/api/analyze']
      });
    }

    // Available APIs endpoint
    if (path === 'apis/available' && method === 'POST') {
      const { api_keys = {} } = req.body || {};
      const available = [];
      
      if (api_keys.openai) available.push('openai');
      if (api_keys.stability) available.push('stability');
      if (api_keys.replicate) available.push('replicate');
      
      return res.status(200).json({
        available,
        count: available.length
      });
    }

    // Analyze endpoint
    if (path === 'analyze' && method === 'POST') {
      const { prompt, context = {}, api_keys = {} } = req.body || {};
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required for analysis' });
      }

      try {
        let enhancedPrompt = prompt;
        let analysisData = {
          content_type: context.contentType || 'general',
          industry: context.industry || 'general',
          style_suggestions: ['professional', 'clean', 'modern'],
          color_palette: ['blue', 'white', 'gray'],
          recommended_apis: [],
          composition: {
            layout: 'balanced composition',
            focus: 'clear subject matter',
            aspect: '16:9 or 4:3'
          }
        };

        // APIキーに基づいて推奨APIを設定
        if (api_keys.openai) analysisData.recommended_apis.push('openai');
        if (api_keys.stability) analysisData.recommended_apis.push('stability');
        if (api_keys.replicate) analysisData.recommended_apis.push('replicate');
        
        if (analysisData.recommended_apis.length === 0) {
          analysisData.recommended_apis.push('demo');
        }

        // OpenAIでプロンプト解析を実行（APIキーがある場合）
        if (api_keys.openai && prompt.length > 10) {
          try {
            const openai = new OpenAI({ apiKey: api_keys.openai });
            const completion = await openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: 'あなたは日本のプロフェッショナルなウェブデザイナーです。ユーザーのプロンプトを解析し、より効果的なAI画像生成プロンプトに改善してください。日本語で回答し、ビジネス用途に適した高品質な仕上がりにしてください。'
                },
                {
                  role: 'user',
                  content: `以下のプロンプトを改善してください:
業界: ${context.industry || '不明'}
コンテンツタイプ: ${context.contentType || '不明'}
プロンプト: ${prompt}

日本のビジネス用途に適した、プロフェッショナルな仕上がりの改善プロンプトを提供してください。`
                }
              ],
              max_tokens: 200,
              temperature: 0.7
            });
            
            enhancedPrompt = completion.choices[0]?.message?.content || enhancedPrompt;
          } catch (openaiError) {
            console.log('OpenAI analysis failed, using basic enhancement:', openaiError.message);
            enhancedPrompt = `${prompt} - Professional Japanese business style, high quality, modern design`;
          }
        } else {
          // 基本的なプロンプト強化
          enhancedPrompt = `${prompt} - Professional Japanese business style, high quality, modern design`;
        }

        analysisData.enhanced_prompt = enhancedPrompt;

        return res.status(200).json({
          success: true,
          analysis: analysisData
        });
      } catch (error) {
        console.error('Analysis error:', error);
        return res.status(500).json({
          error: '解析エラー',
          message: error.message
        });
      }
    }

    // Generate endpoint (simplified)
    if (path === 'generate' && method === 'POST') {
      const { prompt, api_keys = {} } = req.body || {};
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // For demo purposes, return a placeholder response
      return res.status(200).json({
        success: true,
        message: 'Image generation requires actual API implementation',
        metadata: {
          original_prompt: prompt,
          enhanced_prompt: prompt + ' - Professional Japanese style',
          api_used: 'demo',
          cost: 0
        }
      });
    }

    // Batch generate endpoint
    if (path === 'generate/batch' && method === 'POST') {
      const { prompt, count = 1, api_keys = {}, selected_api = 'auto' } = req.body || {};
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (count > 4) {
        return res.status(400).json({ error: '生成枚数は4枚までです' });
      }

      // API選択ロジック
      let apiToUse = selected_api;
      if (apiToUse === 'auto') {
        if (api_keys.openai) apiToUse = 'openai';
        else if (api_keys.stability) apiToUse = 'stability';
        else if (api_keys.replicate) apiToUse = 'replicate';
        else apiToUse = 'demo';
      }

      const images = [];
      const errors = [];
      let totalCost = 0;
      const startTime = Date.now();

      // バッチ生成処理
      for (let i = 0; i < count; i++) {
        try {
          let result;
          switch (apiToUse) {
            case 'openai':
              if (!api_keys.openai) {
                throw new Error('OpenAI API key is required');
              }
              result = await generateWithOpenAI(prompt, api_keys.openai);
              break;

            case 'stability':
              if (!api_keys.stability) {
                throw new Error('Stability AI API key is required');
              }
              result = await generateWithStability(prompt, api_keys.stability);
              break;

            case 'replicate':
              if (!api_keys.replicate) {
                throw new Error('Replicate API token is required');
              }
              result = await generateWithReplicate(prompt, api_keys.replicate);
              break;

            default:
              result = {
                image: generateDemoImage(prompt, i + 1),
                cost: 0
              };
          }

          images.push({
            index: i,
            image: result.image,
            metadata: {
              original_prompt: prompt,
              enhanced_prompt: prompt + ' - Professional Japanese style',
              api_used: apiToUse === 'demo' ? 'demo' : apiToUse,
              cost: result.cost,
              analysis: {
                content_type: 'general',
                industry: 'general',
                style_suggestions: ['professional', 'clean', 'modern'],
                color_palette: ['blue', 'white', 'gray']
              }
            }
          });

          totalCost += result.cost;
        } catch (error) {
          console.error(`Batch generation error for image ${i + 1}:`, error);
          errors.push({
            index: i,
            error: error.message,
            fallback_used: true
          });
          
          // エラー時はデモにフォールバック
          images.push({
            index: i,
            image: generateDemoImage(prompt, i + 1),
            metadata: {
              original_prompt: prompt,
              enhanced_prompt: prompt + ' - Professional Japanese style (fallback)',
              api_used: 'demo (fallback)',
              cost: 0,
              error: error.message
            }
          });
        }
      }

      const generationTime = Date.now() - startTime;

      return res.status(200).json({
        success: true,
        images,
        errors,
        total_cost: totalCost,
        generation_time: generationTime,
        summary: {
          requested: count,
          generated: images.length,
          failed: errors.length,
          api_used: apiToUse
        }
      });
    }

    // URL analysis endpoint - redirect to dedicated handler
    if (path === 'analyze/url' && method === 'POST') {
      return res.status(301).json({
        success: false,
        redirect: '/api/analyze-url',
        message: 'このエンドポイントは /api/analyze-url に移動しました'
      });
    }

    // Default 404 response
    return res.status(404).json({
      error: 'Endpoint not found',
      path: path,
      method: method
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}

// 以下、各API統合用の関数群

// OpenAI DALL-E 3で画像生成
async function generateWithOpenAI(prompt, apiKey) {
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
async function generateWithStability(prompt, apiKey) {
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
async function generateWithReplicate(prompt, apiToken) {
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
function generateDemoImage(prompt, index = 1) {
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#e3f2fd;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#bbdefb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#grad${index})"/>
      <circle cx="200" cy="150" r="40" fill="#2196f3" opacity="0.7"/>
      <rect x="150" y="220" width="100" height="60" rx="10" fill="#1976d2" opacity="0.8"/>
      <text x="200" y="240" text-anchor="middle" font-family="Arial" font-size="12" fill="#0d47a1">
        デモ画像 ${index}
      </text>
      <text x="200" y="260" text-anchor="middle" font-family="Arial" font-size="8" fill="#1565c0">
        ${prompt.substring(0, 20)}${prompt.length > 20 ? '...' : ''}
      </text>
      <text x="200" y="350" text-anchor="middle" font-family="Arial" font-size="8" fill="#666">
        ${new Date().toLocaleTimeString('ja-JP')}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}