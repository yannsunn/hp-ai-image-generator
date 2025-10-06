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
    // 本番環境では設定されたoriginリストをチェック
    const allowedOrigins = config.allowedOrigins;

    if (!origin) {
      // originがない場合（サーバー間通信など）は拒否
      logger.warn('CORS: No origin header provided');
      return false;
    }

    // 文字列の完全一致または正規表現でチェック
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      logger.warn('CORS violation attempt:', { origin, userAgent: req?.headers?.['user-agent'] });
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