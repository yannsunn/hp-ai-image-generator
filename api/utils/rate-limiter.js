// レート制限実装
const rateLimit = new Map();

const rateLimiter = {
  checkApiLimit: (req, apiName) => {
    const clientId = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const key = `${apiName}:${clientId}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1分
    const maxRequests = 10;
    
    if (!rateLimit.has(key)) {
      rateLimit.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, maxRequests };
    }
    
    const limit = rateLimit.get(key);
    
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + windowMs;
      return { allowed: true, maxRequests };
    }
    
    if (limit.count >= maxRequests) {
      return { 
        allowed: false, 
        maxRequests,
        timeUntilReset: limit.resetTime - now 
      };
    }
    
    limit.count++;
    return { allowed: true, maxRequests };
  }
};

module.exports = { rateLimiter };