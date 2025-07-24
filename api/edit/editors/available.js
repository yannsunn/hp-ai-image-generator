export default function handler(req, res) {
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
    const { api_keys = {} } = req.body || {};

    // 利用可能な編集エンジン
    const availableEditors = [];

    // 基本的な編集機能（APIキー不要）
    availableEditors.push({
      id: 'basic',
      name: 'Basic Editor',
      type: 'client-side',
      capabilities: ['brightness', 'contrast', 'saturation', 'filters'],
      cost_per_edit: 0,
      description: 'クライアントサイドでの基本的な画像編集'
    });

    // API キーがある場合の高度な編集機能
    if (api_keys.openai) {
      availableEditors.push({
        id: 'openai_dalle_edit',
        name: 'DALL-E Image Edit',
        type: 'ai-powered',
        capabilities: ['inpainting', 'outpainting', 'style_transfer', 'object_removal'],
        cost_per_edit: 0.02,
        description: 'OpenAI DALL-E による AI 画像編集'
      });
    }

    if (api_keys.stability) {
      availableEditors.push({
        id: 'stability_edit',
        name: 'Stability AI Edit',
        type: 'ai-powered',
        capabilities: ['style_transfer', 'enhancement', 'background_removal'],
        cost_per_edit: 0.01,
        description: 'Stability AI による画像編集・加工'
      });
    }

    if (api_keys.replicate) {
      availableEditors.push({
        id: 'replicate_edit',
        name: 'Replicate Models',
        type: 'ai-powered',
        capabilities: ['upscaling', 'restoration', 'colorization', 'style_transfer'],
        cost_per_edit: 0.005,
        description: 'Replicate の各種画像処理モデル'
      });
    }

    return res.status(200).json({
      success: true,
      available_editors: availableEditors,
      total_editors: availableEditors.length,
      basic_editing_available: true,
      ai_editing_available: availableEditors.some(e => e.type === 'ai-powered'),
      estimated_costs: {
        basic: 0,
        ai_minimum: Math.min(...availableEditors.filter(e => e.type === 'ai-powered').map(e => e.cost_per_edit), Infinity) || 0
      }
    });

  } catch (error) {
    console.error('Available Editors API Error:', error);
    return res.status(500).json({
      error: 'サーバーエラー',
      message: error.message
    });
  }
}