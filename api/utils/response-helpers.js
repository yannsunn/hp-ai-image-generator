// 統一されたエラーレスポンスを返すヘルパー関数
function sendErrorResponse(res, statusCode, message, details = null) {
  const response = {
    success: false,
    error: message
  };
  
  if (details) {
    response.details = details;
  }
  
  res.setHeader('Content-Type', 'application/json');
  return res.status(statusCode).json(response);
}

// 統一された成功レスポンスを返すヘルパー関数
function sendSuccessResponse(res, data) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    success: true,
    ...data
  });
}

const config = require('../config');
const logger = require('./logger');

// セキュアなCORSヘッダーを設定
function setCorsHeaders(res, req) {
  const origin = req?.headers?.origin;
  
  // originの検証と設定
  if (config.env.isDevelopment) {
    // 開発環境では全てのoriginを許可
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    // 本番環境では厳密な検証
    const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean);
    
    if (!origin) {
      // サーバー間通信の場合
      res.setHeader('Access-Control-Allow-Origin', 'null');
    } else if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      logger.warn('CORS violation attempt:', { origin, userAgent: req?.headers?.['user-agent'] });
      // 不正なoriginの場合はヘッダーを設定しない
      return false;
    }
  }
  
  res.setHeader('Access-Control-Allow-Credentials', config.cors.credentials);
  res.setHeader('Access-Control-Allow-Methods', config.cors.methods.join(','));
  res.setHeader('Access-Control-Allow-Headers', config.cors.allowedHeaders.join(', '));
  res.setHeader('Access-Control-Expose-Headers', config.cors.exposedHeaders.join(', '));
  res.setHeader('Access-Control-Max-Age', config.cors.maxAge);
  
  return true;
}

module.exports = {
  sendErrorResponse,
  sendSuccessResponse,
  setCorsHeaders
};