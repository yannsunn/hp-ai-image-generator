const Replicate = require('replicate');

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Testing Replicate connection...');

  try {
    // 環境変数の確認
    const hasToken = !!process.env.REPLICATE_API_TOKEN;
    const tokenLength = process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.length : 0;
    const tokenPrefix = process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.substring(0, 10) + '...' : 'Not set';

    console.log('Replicate token info:', { hasToken, tokenLength, tokenPrefix });

    if (!hasToken) {
      return res.status(200).json({
        success: false,
        error: 'REPLICATE_API_TOKEN is not set',
        env: {
          hasToken: false
        }
      });
    }

    // Replicateクライアントの初期化をテスト
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    // 実際の画像生成APIを簡単にテスト
    console.log('Testing actual model run...');
    const testOutput = await replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      {
        input: {
          prompt: 'A simple test image',
          width: 512,
          height: 512,
          num_outputs: 1,
          scheduler: 'K_EULER',
          num_inference_steps: 10,
          guidance_scale: 7.5
        }
      }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Replicate connection and test generation successful',
      env: {
        hasToken,
        tokenLength,
        tokenPrefix
      },
      testOutput: {
        type: typeof testOutput,
        isArray: Array.isArray(testOutput),
        content: testOutput
      }
    });

  } catch (error) {
    console.error('Replicate test error:', error);
    
    return res.status(200).json({
      success: false,
      error: 'Replicate connection failed',
      details: error.message,
      type: error.constructor.name,
      env: {
        hasToken: !!process.env.REPLICATE_API_TOKEN,
        tokenLength: process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.length : 0
      }
    });
  }
};