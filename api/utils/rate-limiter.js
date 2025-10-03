// レート制限実装（Vercel KV + メモリフォールバック）
const logger = require('./logger');

// メモリベースのフォールバック
const memoryRateLimit = new Map();

// Vercel KV利用可能かチェック
let kvAvailable = false;
let kv = null;

async function initKV() {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const kvModule = await import('@vercel/kv');
      kv = kvModule.kv;
      kvAvailable = true;
      logger.info('Rate limiter initialized with Vercel KV');
    } else {
      logger.warn('KV not configured, using memory-based rate limiting');
    }
  } catch (error) {
    logger.warn('Failed to initialize KV, falling back to memory:', error.message);
    kvAvailable = false;
  }
}

// 初期化実行
initKV();

/**
 * KVベースのレート制限チェック
 */
async function checkApiLimitKV(clientId, apiName, windowMs, maxRequests) {
  try {
    const key = `ratelimit:${apiName}:${clientId}`;
    const now = Date.now();

    // 現在のカウントを取得
    const data = await kv.get(key);

    if (!data) {
      // 新規キー
      await kv.set(key, { count: 1, resetTime: now + windowMs }, { ex: Math.ceil(windowMs / 1000) });
      return { allowed: true, maxRequests, count: 1 };
    }

    // リセット時刻を過ぎている場合
    if (now > data.resetTime) {
      await kv.set(key, { count: 1, resetTime: now + windowMs }, { ex: Math.ceil(windowMs / 1000) });
      return { allowed: true, maxRequests, count: 1 };
    }

    // 制限超過チェック
    if (data.count >= maxRequests) {
      return {
        allowed: false,
        maxRequests,
        count: data.count,
        timeUntilReset: data.resetTime - now
      };
    }

    // カウント増加
    data.count++;
    await kv.set(key, data, { ex: Math.ceil(windowMs / 1000) });

    return { allowed: true, maxRequests, count: data.count };
  } catch (error) {
    logger.error('KV rate limit check failed:', error);
    // KVエラー時はメモリベースにフォールバック
    return checkApiLimitMemory(clientId, apiName, windowMs, maxRequests);
  }
}

/**
 * メモリベースのレート制限チェック（フォールバック）
 */
function checkApiLimitMemory(clientId, apiName, windowMs, maxRequests) {
  const key = `${apiName}:${clientId}`;
  const now = Date.now();

  if (!memoryRateLimit.has(key)) {
    memoryRateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, maxRequests, count: 1 };
  }

  const limit = memoryRateLimit.get(key);

  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + windowMs;
    return { allowed: true, maxRequests, count: 1 };
  }

  if (limit.count >= maxRequests) {
    return {
      allowed: false,
      maxRequests,
      count: limit.count,
      timeUntilReset: limit.resetTime - now
    };
  }

  limit.count++;
  return { allowed: true, maxRequests, count: limit.count };
}

/**
 * レート制限チェック（統合インターフェース）
 */
const rateLimiter = {
  checkApiLimit: async (req, apiName, options = {}) => {
    const clientId = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.connection?.remoteAddress ||
                     'unknown';

    const windowMs = options.windowMs || 60 * 1000; // デフォルト1分
    const maxRequests = options.maxRequests || 10;  // デフォルト10リクエスト

    if (kvAvailable && kv) {
      return await checkApiLimitKV(clientId, apiName, windowMs, maxRequests);
    } else {
      return checkApiLimitMemory(clientId, apiName, windowMs, maxRequests);
    }
  },

  /**
   * レート制限をリセット（管理用）
   */
  resetLimit: async (clientId, apiName) => {
    try {
      if (kvAvailable && kv) {
        const key = `ratelimit:${apiName}:${clientId}`;
        await kv.del(key);
        logger.info(`Rate limit reset for ${key}`);
      } else {
        const key = `${apiName}:${clientId}`;
        memoryRateLimit.delete(key);
      }
      return { success: true };
    } catch (error) {
      logger.error('Failed to reset rate limit:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * KV利用状況確認
   */
  getStatus: () => ({
    kvAvailable,
    backend: kvAvailable ? 'Vercel KV' : 'Memory',
    memoryKeys: memoryRateLimit.size
  })
};

module.exports = { rateLimiter };