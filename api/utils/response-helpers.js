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

// CORSヘッダーを設定
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

module.exports = {
  sendErrorResponse,
  sendSuccessResponse,
  setCorsHeaders
};