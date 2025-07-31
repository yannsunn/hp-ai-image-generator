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
      const available = [];
      
      if (process.env.OPENAI_API_KEY) available.push('openai');
      if (process.env.STABILITY_API_KEY) available.push('stability');
      if (process.env.REPLICATE_API_TOKEN) available.push('replicate');
      
      return res.status(200).json({
        available,
        count: available.length
      });
    }

    // Analyze endpoint
    if (path === 'analyze' && method === 'POST') {
      const { prompt, context = {} } = req.body || {};
      
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

        // 環境変数に基づいて推奨APIを設定
        if (process.env.OPENAI_API_KEY) analysisData.recommended_apis.push('openai');
        if (process.env.STABILITY_API_KEY) analysisData.recommended_apis.push('stability');
        if (process.env.REPLICATE_API_TOKEN) analysisData.recommended_apis.push('replicate');
        
        if (analysisData.recommended_apis.length === 0) {
          return res.status(500).json({ error: 'APIキーが設定されていません。.envファイルを確認してください。' });
        }

        // OpenAIでプロンプト解析を実行（APIキーがある場合）
        if (process.env.OPENAI_API_KEY && prompt.length > 10) {
          try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'あなたは日本のプロフェッショナルなウェブデザイナーであり、AI画像生成のエキスパートです。ユーザーが入力したプロンプトを、ホームページ用の高品質なビジネス画像生成に最適化してください。\n\n重要なポイント:\n- プロフェッショナルで信頼感のあるビジュアル\n- 日本のビジネス文化に適したデザイン\n- ウェブサイトでの使用に適したアスペクト比やサイズ\n- ターゲットユーザーに訴求する魅力的なビジュアル\n\n最適化されたプロンプトのみを返し、説明は不要です。'
                },
                {
                  role: 'user',
                  content: `業界: ${context.industry || '一般'}
コンテンツタイプ: ${context.contentType || 'ヒーロー'}
ユーザープロンプト: "${prompt}"

このプロンプトを、${context.industry || '一般'}業界のホームページ用${context.contentType || 'ヒーロー'}セクションに適した、プロフェッショナルな日本語ビジネス画像生成用に最適化してください。`
                }
              ],
              max_tokens: 150,
              temperature: 0.4
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

    // Generate endpoint - redirect to dedicated handler
    if (path === 'generate' && method === 'POST') {
      // この古い実装は使用しない - 専用のgenerate.jsにリダイレクト
      return res.status(301).json({
        success: false,
        redirect: '/api/generate',
        message: 'このエンドポイントは /api/generate に移動しました'
      });
    }

    // Batch generate endpoint - redirect to dedicated handler
    if (path === 'generate/batch' && method === 'POST') {
      return res.status(301).json({
        success: false,
        redirect: '/api/generate/batch',
        message: 'このエンドポイントは /api/generate/batch に移動しました'
      });
    }
    
    // OLD BATCH CODE - REMOVE THIS SECTION
    if (false && path === 'generate/batch' && method === 'POST') {
      const { prompt, count = 1, selected_api = 'auto' } = req.body || {};
      
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (count > 8) {
        return res.status(400).json({ error: '生成枚数は8枚までです' });
      }

      // API選択ロジック
      let apiToUse = selected_api;
      if (apiToUse === 'auto') {
        if (process.env.OPENAI_API_KEY) apiToUse = 'openai';
        else if (process.env.STABILITY_API_KEY) apiToUse = 'stability';
        else if (process.env.REPLICATE_API_TOKEN) apiToUse = 'replicate';
        else {
          return res.status(500).json({ error: 'APIキーが設定されていません。.envファイルを確認してください。' });
        }
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
              if (!process.env.OPENAI_API_KEY) {
                throw new Error('OpenAI API key is required');
              }
              result = await generateWithOpenAI(prompt, process.env.OPENAI_API_KEY);
              break;

            case 'stability':
              if (!process.env.STABILITY_API_KEY) {
                throw new Error('Stability AI API key is required');
              }
              result = await generateWithStability(prompt, process.env.STABILITY_API_KEY);
              break;

            case 'replicate':
              if (!process.env.REPLICATE_API_TOKEN) {
                throw new Error('Replicate API token is required');
              }
              result = await generateWithReplicate(prompt, process.env.REPLICATE_API_TOKEN);
              break;

            default:
              return res.status(500).json({ error: '無効なAPIが指定されました' });
          }

          images.push({
            index: i,
            image: result.image,
            metadata: {
              original_prompt: prompt,
              enhanced_prompt: prompt + ' - Professional Japanese style',
              api_used: apiToUse,
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
          
          // エラー時はエラー情報のみ追加
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

// デモ画像生成関数は削除（本番環境）