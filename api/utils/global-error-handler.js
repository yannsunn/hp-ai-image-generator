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

        // 本番環境でも詳細なエラー情報を返す（デバッグ用）
        // セキュリティ上の懸念がある場合は後で調整可能
        let errorMessage = error.message || '内部サーバーエラーが発生しました';
        
        // OAuth認証エラーの場合は日本語メッセージに変換
        if (error.message?.includes('OAuth token has expired') || error.message?.includes('authentication_error')) {
          errorMessage = 'APIキーが期限切れです。新しいAPIキーを取得して環境変数を更新してください。';
        } else if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
          errorMessage = 'APIキーが無効です。環境変数の設定を確認してください。';
        }
        
        const errorDetails = error.stack;

        // 構造化ログで詳細を出力（Vercelログで確認可能）
        logger.error('API Error Details', {
          endpoint: req.url,
          method: req.method,
          errorMessage,
          stack: error.stack,
          requestBody: req.body,
          environment: {
            NODE_ENV: process.env.NODE_ENV,
            GEMINI_API_KEY_SET: !!process.env.GEMINI_API_KEY,
            GEMINI_IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL
          }
        });

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