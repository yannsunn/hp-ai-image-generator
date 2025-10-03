// KVベースのキャッシュヘルパー
const logger = require('./logger');
const crypto = require('crypto');

let kvAvailable = false;
let kv = null;

// KV初期化
async function initKV() {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const kvModule = await import('@vercel/kv');
      kv = kvModule.kv;
      kvAvailable = true;
      logger.info('Cache helper initialized with Vercel KV');
    } else {
      logger.warn('KV not configured, caching disabled');
    }
  } catch (error) {
    logger.warn('Failed to initialize KV for caching:', error.message);
    kvAvailable = false;
  }
}

initKV();

/**
 * URLからキャッシュキーを生成
 */
function generateCacheKey(url, prefix = 'analysis') {
  const urlHash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
  return `${prefix}:${urlHash}:${url.substring(0, 50)}`;
}

/**
 * 分析結果をキャッシュから取得
 */
async function getCachedAnalysis(url) {
  if (!kvAvailable || !kv) {
    return null;
  }

  try {
    const key = generateCacheKey(url);
    const cached = await kv.get(key);

    if (cached) {
      logger.info('Cache hit for URL:', url);
      return {
        ...cached,
        from_cache: true,
        cached_at: cached.cached_at
      };
    }

    logger.info('Cache miss for URL:', url);
    return null;
  } catch (error) {
    logger.error('Cache retrieval error:', error);
    return null;
  }
}

/**
 * 分析結果をキャッシュに保存
 */
async function setCachedAnalysis(url, analysisData, ttlSeconds = 86400) {
  if (!kvAvailable || !kv) {
    return false;
  }

  try {
    const key = generateCacheKey(url);
    const cacheData = {
      ...analysisData,
      cached_at: new Date().toISOString(),
      url
    };

    await kv.set(key, cacheData, { ex: ttlSeconds });
    logger.info(`Analysis cached for ${ttlSeconds}s:`, url);
    return true;
  } catch (error) {
    logger.error('Cache storage error:', error);
    return false;
  }
}

/**
 * 画像生成プロンプトをキャッシュから取得
 */
async function getCachedPrompt(promptHash) {
  if (!kvAvailable || !kv) {
    return null;
  }

  try {
    const key = `prompt:${promptHash}`;
    const cached = await kv.get(key);

    if (cached) {
      logger.info('Prompt cache hit');
      return cached;
    }

    return null;
  } catch (error) {
    logger.error('Prompt cache retrieval error:', error);
    return null;
  }
}

/**
 * 画像生成プロンプトをキャッシュに保存
 */
async function setCachedPrompt(promptHash, promptData, ttlSeconds = 3600) {
  if (!kvAvailable || !kv) {
    return false;
  }

  try {
    const key = `prompt:${promptHash}`;
    await kv.set(key, promptData, { ex: ttlSeconds });
    logger.info('Prompt cached');
    return true;
  } catch (error) {
    logger.error('Prompt cache storage error:', error);
    return false;
  }
}

/**
 * キャッシュをクリア
 */
async function clearCache(pattern = '*') {
  if (!kvAvailable || !kv) {
    return { success: false, message: 'KV not available' };
  }

  try {
    // Vercel KVはscanをサポートしていないため、個別削除が必要
    logger.warn('Cache clear requested but not fully supported by Vercel KV');
    return { success: true, message: 'Cache clear requested (individual keys must be deleted)' };
  } catch (error) {
    logger.error('Cache clear error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * キャッシュ統計取得
 */
function getCacheStats() {
  return {
    kvAvailable,
    backend: kvAvailable ? 'Vercel KV' : 'Disabled'
  };
}

module.exports = {
  getCachedAnalysis,
  setCachedAnalysis,
  getCachedPrompt,
  setCachedPrompt,
  clearCache,
  getCacheStats,
  generateCacheKey
};
