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
        // Content-Typeを明示的に設定（JSONパースエラー対策）
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        // 開発環境では詳細なエラー情報を含める
        const isDev = process.env.NODE_ENV === 'development';
        const errorMessage = isDev ? error.message : '内部サーバーエラーが発生しました';
        const errorDetails = isDev ? error.stack : undefined;
        
        try {
          return sendErrorResponse(res, 500, errorMessage, errorDetails);
        } catch (sendError) {
          // sendErrorResponseも失敗した場合の最終手段
          logger.error('Failed to send error response:', sendError);
          res.status(500).end();
        }
      }
    }
  };
}

module.exports = {
  withErrorHandler
};