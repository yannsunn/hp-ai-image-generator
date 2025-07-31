const logger = require('./logger');
const { sendErrorResponse } = require('./response-helpers');

/**
 * API エンドポイント用のグローバルエラーハンドラー
 * すべてのAPIエンドポイントでこのハンドラーを使用してエラーを統一的に処理
 */
function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      // レスポンスがJSON形式であることを保証
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json');
      }
      
      return await handler(req, res);
    } catch (error) {
      logger.error('API Error:', {
        endpoint: req.url,
        method: req.method,
        error: error.message,
        stack: error.stack,
        body: req.body,
        headers: req.headers
      });
      
      // レスポンスがまだ送信されていない場合のみエラーレスポンスを送信
      if (!res.headersSent) {
        // 開発環境では詳細なエラー情報を含める
        const isDev = process.env.NODE_ENV === 'development';
        const errorMessage = isDev ? error.message : '内部サーバーエラーが発生しました';
        const errorDetails = isDev ? error.stack : undefined;
        
        return sendErrorResponse(res, 500, errorMessage, errorDetails);
      }
    }
  };
}

module.exports = {
  withErrorHandler
};