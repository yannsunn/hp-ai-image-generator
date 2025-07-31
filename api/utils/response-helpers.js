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

// CORSヘッダーを設定
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', config.cors.credentials);
  res.setHeader('Access-Control-Allow-Origin', config.cors.origin);
  res.setHeader('Access-Control-Allow-Methods', config.cors.methods.join(','));
  res.setHeader('Access-Control-Allow-Headers', config.cors.headers.join(', '));
}

module.exports = {
  sendErrorResponse,
  sendSuccessResponse,
  setCorsHeaders
};