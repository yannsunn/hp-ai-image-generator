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