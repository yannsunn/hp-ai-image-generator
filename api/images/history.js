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
      
      // 数値の検証と正規化
      const validLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
      const validOffset = Math.max(parseInt(offset, 10) || 0, 0);
      
      // ユーザーの画像IDリストを取得
      const imageIds = await kv.smembers(`user:${userId}:images`);
      
      if (!imageIds || imageIds.length === 0) {
        return sendSuccessResponse(res, {
          images: [],
          total: 0,
          limit: validLimit,
          offset: validOffset
        });
      }
      
      // 画像データを取得
      const images = [];
      const slicedImageIds = imageIds.slice(validOffset, validOffset + validLimit);
      
      for (const imageId of slicedImageIds) {
        try {
          const imageData = await kv.get(`image:${imageId}`);
          if (imageData) {
            images.push(imageData);
          }
        } catch (kvError) {
          logger.warn(`Failed to get image ${imageId}:`, kvError);
          // 個別の画像取得エラーは無視して続行
        }
      }
      
      // 作成日時でソート（新しい順）
      images.sort((a, b) => {
        const dateA = new Date(a.metadata?.createdAt || 0);
        const dateB = new Date(b.metadata?.createdAt || 0);
        return dateB - dateA;
      });
      
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