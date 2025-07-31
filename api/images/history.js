const { kv } = require('@vercel/kv');
const logger = require('../utils/logger');
const { setCorsHeaders, sendErrorResponse, sendSuccessResponse } = require('../utils/response-helpers');

module.exports = async function handler(req, res) {
  // Enable CORS
  setCorsHeaders(res);

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
        return sendSuccessResponse(res, {
          images: [],
          total: 0
        });
      }
      
      // 画像データを取得
      const images = [];
      for (const imageId of imageIds.slice(validOffset, validOffset + validLimit)) {
        const imageData = await kv.get(`image:${imageId}`);
        if (imageData) {
          images.push(imageData);
        }
      }
      
      // 作成日時でソート（新しい順）
      images.sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt));
      
      return sendSuccessResponse(res, {
        images: images,
        total: imageIds.length,
        limit: validLimit,
        offset: validOffset
      });
    }

    // Method not allowedは上位のhandlerで処理済み
    
  } catch (error) {
    logger.error('Get history error:', error);
    
    // Vercel KVが設定されていない場合のフォールバック
    if (error.message && error.message.includes('KV_REST_API_URL')) {
      return sendSuccessResponse(res, {
        images: [],
        total: 0,
        warning: 'Vercel KVが設定されていないため、履歴は利用できません'
      });
    }
    
    return sendErrorResponse(res, 500, error.message || '履歴の取得に失敗しました');
  }
};