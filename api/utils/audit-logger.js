// 監査ログシステム
const logger = require('./logger');

let kvAvailable = false;
let kv = null;

// KV初期化
async function initKV() {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const kvModule = await import('@vercel/kv');
      kv = kvModule.kv;
      kvAvailable = true;
      logger.info('Audit logger initialized with Vercel KV');
    } else {
      logger.warn('KV not configured, audit logs will only be in console');
    }
  } catch (error) {
    logger.warn('Failed to initialize KV for audit logging:', error.message);
    kvAvailable = false;
  }
}

initKV();

/**
 * 監査ログを記録
 */
async function auditLog(eventType, data, req = null) {
  const auditEntry = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    data,
    metadata: {}
  };

  // リクエスト情報を追加
  if (req) {
    auditEntry.metadata = {
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
          req.connection?.remoteAddress ||
          'unknown',
      user_agent: req.headers['user-agent'] || 'unknown',
      user_id: req.headers['x-user-id'] || 'anonymous',
      origin: req.headers.origin || 'unknown'
    };
  }

  // コンソールログ
  logger.info('AUDIT:', {
    type: eventType,
    ...auditEntry
  });

  // KVに保存（オプション）
  if (kvAvailable && kv) {
    try {
      const key = `audit:${eventType}:${Date.now()}:${Math.random().toString(36).substring(7)}`;
      await kv.set(key, auditEntry, { ex: 2592000 }); // 30日間保持
    } catch (error) {
      logger.error('Failed to save audit log to KV:', error);
    }
  }

  return auditEntry;
}

/**
 * 画像生成監査ログ
 */
async function auditImageGeneration(req, result) {
  return await auditLog('image_generation', {
    prompt: result.metadata?.original_prompt?.substring(0, 200) || 'unknown',
    api: result.metadata?.api_used || 'unknown',
    cost: result.metadata?.cost || 0,
    model: result.metadata?.analysis?.model || 'unknown',
    success: !!result.image,
    generation_time: result.metadata?.generation_time || 0
  }, req);
}

/**
 * URL分析監査ログ
 */
async function auditUrlAnalysis(req, url, result) {
  return await auditLog('url_analysis', {
    url,
    industry: result.industry || 'unknown',
    content_type: result.content_type || 'unknown',
    method: result.analysis_method || result.method || 'unknown',
    from_cache: result.from_cache || false,
    success: result.success !== false
  }, req);
}

/**
 * APIエラー監査ログ
 */
async function auditApiError(req, errorType, errorMessage, details = {}) {
  return await auditLog('api_error', {
    error_type: errorType,
    error_message: errorMessage,
    ...details
  }, req);
}

/**
 * レート制限違反監査ログ
 */
async function auditRateLimitViolation(req, apiName) {
  return await auditLog('rate_limit_violation', {
    api_name: apiName,
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  }, req);
}

/**
 * セキュリティイベント監査ログ
 */
async function auditSecurityEvent(req, eventType, details) {
  return await auditLog('security_event', {
    event: eventType,
    ...details
  }, req);
}

/**
 * コスト追跡用サマリー取得
 */
async function getCostSummary(startDate, endDate) {
  if (!kvAvailable || !kv) {
    return {
      available: false,
      message: 'KV not available for cost summary'
    };
  }

  try {
    // Note: Vercel KVは範囲クエリをサポートしないため、
    // 実装には外部データベース（Planetscale等）が推奨
    logger.warn('Cost summary requires external database implementation');
    return {
      available: false,
      message: 'Cost summary requires external database'
    };
  } catch (error) {
    logger.error('Cost summary error:', error);
    return { available: false, error: error.message };
  }
}

/**
 * 監査ログ統計取得
 */
function getAuditStats() {
  return {
    kvAvailable,
    backend: kvAvailable ? 'Vercel KV' : 'Console Only',
    retention_days: kvAvailable ? 30 : 0
  };
}

module.exports = {
  auditLog,
  auditImageGeneration,
  auditUrlAnalysis,
  auditApiError,
  auditRateLimitViolation,
  auditSecurityEvent,
  getCostSummary,
  getAuditStats
};
