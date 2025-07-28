const { kv } = require('@vercel/kv');
const { v4: uuidv4 } = require('uuid');

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
    if (req.method === 'POST') {
      const { image, metadata } = req.body;
      
      if (!image || !metadata) {
        return res.status(400).json({ error: 'Image and metadata are required' });
      }

      const imageId = uuidv4();
      const timestamp = new Date().toISOString();
      
      const imageData = {
        id: imageId,
        image: image,
        metadata: {
          ...metadata,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      };

      // Vercel KVに保存（有効期限30日）
      await kv.set(`image:${imageId}`, imageData, { ex: 30 * 24 * 60 * 60 });
      
      // ユーザーの画像リストに追加
      const userId = req.headers['x-user-id'] || 'default';
      await kv.sadd(`user:${userId}:images`, imageId);
      
      console.log(`Image saved: ${imageId}`);
      
      return res.status(200).json({
        success: true,
        imageId: imageId,
        message: '画像が保存されました'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Save image error:', error);
    
    // Vercel KVが設定されていない場合のフォールバック
    if (error.message && error.message.includes('KV_REST_API_URL')) {
      return res.status(200).json({
        success: true,
        imageId: 'demo-' + Date.now(),
        message: '画像が保存されました（デモモード）',
        warning: 'Vercel KVが設定されていないため、実際には保存されていません'
      });
    }
    
    return res.status(500).json({
      error: 'サーバーエラー',
      message: error.message || '画像の保存に失敗しました'
    });
  }
};