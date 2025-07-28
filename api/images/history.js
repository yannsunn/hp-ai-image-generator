const { kv } = require('@vercel/kv');

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

  try {
    if (req.method === 'GET') {
      const userId = req.headers['x-user-id'] || 'default';
      const { limit = 20, offset = 0 } = req.query;
      
      // ユーザーの画像IDリストを取得
      const imageIds = await kv.smembers(`user:${userId}:images`);
      
      if (!imageIds || imageIds.length === 0) {
        return res.status(200).json({
          success: true,
          images: [],
          total: 0
        });
      }
      
      // 画像データを取得
      const images = [];
      for (const imageId of imageIds.slice(offset, offset + limit)) {
        const imageData = await kv.get(`image:${imageId}`);
        if (imageData) {
          images.push(imageData);
        }
      }
      
      // 作成日時でソート（新しい順）
      images.sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt));
      
      return res.status(200).json({
        success: true,
        images: images,
        total: imageIds.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Get history error:', error);
    
    // Vercel KVが設定されていない場合のフォールバック
    if (error.message && error.message.includes('KV_REST_API_URL')) {
      return res.status(200).json({
        success: true,
        images: [],
        total: 0,
        warning: 'Vercel KVが設定されていないため、履歴は利用できません'
      });
    }
    
    return res.status(500).json({
      error: 'サーバーエラー',
      message: error.message || '履歴の取得に失敗しました'
    });
  }
};