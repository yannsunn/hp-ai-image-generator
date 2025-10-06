const { setCorsHeaders, sendErrorResponse } = require('./response-helpers');
const { rateLimiter } = require('./rate-limiter');
const { auditRateLimitViolation } = require('./audit-logger');
const logger = require('./logger');

/**
 * 標準的なAPI前処理ミドルウェア
 * CORS、OPTIONS、メソッド検証、レート制限を一括処理
 */
async function withStandardMiddleware(req, res, endpointName, allowedMethods = ['POST']) {
  // CORS設定
  if (!setCorsHeaders(res, req)) {
    sendErrorResponse(res, 403, 'CORSポリシー違反');
    return false;
  }

  // OPTIONSリクエスト処理
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }

  // メソッド検証
  if (!allowedMethods.includes(req.method)) {
    const methodList = allowedMethods.join(', ');
    sendErrorResponse(res, 405, `許可されたメソッド: ${methodList}`);
    return false;
  }

  // レート制限チェック
  const rateLimitResult = await rateLimiter.checkApiLimit(req, endpointName);
  if (!rateLimitResult.allowed) {
    await auditRateLimitViolation(req, endpointName);
    const retryAfter = Math.ceil(rateLimitResult.timeUntilReset / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    sendErrorResponse(res, 429, 'レート制限に達しました',
      `1分間に${rateLimitResult.maxRequests}回までのリクエストが可能です。${retryAfter}秒後に再試行してください。`);
    return false;
  }

  return true;
}

/**
 * API環境変数チェック
 */
function checkGeminiApiKey() {
  if (!process.env.GEMINI_API_KEY) {
    logger.error('GEMINI_API_KEY not configured');
    return {
      valid: false,
      error: 'Gemini APIキーが設定されていません',
      details: 'Vercel環境変数にGEMINI_API_KEYを設定してください'
    };
  }
  return { valid: true };
}

module.exports = {
  withStandardMiddleware,
  checkGeminiApiKey
};
