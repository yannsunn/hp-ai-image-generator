// 簡易的なレート制限の実装
const rateLimit = new Map();

function createRateLimiter(maxRequests = 10, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const key = `${ip}:${req.url}`;
    const now = Date.now();
    
    if (!rateLimit.has(key)) {
      rateLimit.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const limit = rateLimit.get(key);
    
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + windowMs;
      return next();
    }
    
    if (limit.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `最大${maxRequests}回/分のリクエスト制限を超えました。しばらくお待ちください。`
      });
    }
    
    limit.count++;
    next();
  };
}

// 古いエントリのクリーンアップ（メモリリーク防止）
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of rateLimit.entries()) {
    if (now > limit.resetTime + 60000) {
      rateLimit.delete(key);
    }
  }
}, 60000);

module.exports = { createRateLimiter };