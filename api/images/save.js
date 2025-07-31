const { kv } = require('@vercel/kv');
const { v4: uuidv4 } = require('uuid');
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
    if (req.method === 'POST') {
      const { image, metadata } = req.body;
      
      if (!image || !metadata) {
        return sendErrorResponse(res, 400, 'Image and metadata are required');
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
      
      
      return sendSuccessResponse(res, {
        imageId: imageId,
        message: '画像が保存されました'
      });
    }

    // Method not allowedは上位のhandlerで処理済み
    
  } catch (error) {
    logger.error('Save image error:', error);
    
    // Vercel KVが設定されていない場合のフォールバック
    if (error.message && error.message.includes('KV_REST_API_URL')) {
      // KVが設定されていない場合は成功として扱う（ローカルストレージで対応）
      return sendSuccessResponse(res, {
        imageId: 'local-' + Date.now(),
        message: '画像がローカルに保存されました',
        warning: 'Vercel KVが設定されていないため、ローカルストレージを使用しています'
      });
    }
    
    return sendErrorResponse(res, 500, error.message || '画像の保存に失敗しました');
  }
};