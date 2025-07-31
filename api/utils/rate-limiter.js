const logger = require('./logger');
const config = require('../config');

// メモリベースの簡易レート制限（本番環境ではRedisを推奨）
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.resetInterval = 60000; // 1分
    
    // 定期的にカウンターをリセット
    setInterval(() => {
      this.cleanup();
    }, this.resetInterval);
  }

  // 古いエントリをクリーンアップ
  cleanup() {
    const now = Date.now();
    const cutoff = now - this.resetInterval;
    
    for (const [key, data] of this.requests.entries()) {
      if (data.resetTime < cutoff) {
        this.requests.delete(key);
      }
    }
  }

  // クライアント識別子を生成
  getClientId(req) {
    // IP アドレスとUser-Agentを組み合わせて識別
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress || 
               req.ip ||
               'unknown';
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    return `${ip}:${userAgent.substring(0, 50)}`;
  }

  // レート制限チェック
  checkLimit(req, maxRequests = 30, windowMs = 60000) {
    const clientId = this.getClientId(req);
    const now = Date.now();
    
    let clientData = this.requests.get(clientId);
    
    if (!clientData || now - clientData.resetTime > windowMs) {
      // 新しいウィンドウを開始
      clientData = {
        count: 0,
        resetTime: now,
        firstRequest: now
      };
    }

    clientData.count++;
    this.requests.set(clientId, clientData);

    const isAllowed = clientData.count <= maxRequests;
    const timeUntilReset = Math.max(0, windowMs - (now - clientData.resetTime));

    if (!isAllowed) {
      logger.warn('Rate limit exceeded:', {
        clientId: clientId.substring(0, 20) + '***', // プライバシー保護
        count: clientData.count,
        maxRequests,
        timeUntilReset,
        userAgent: req.headers['user-agent']?.substring(0, 100)
      });
    }

    return {
      allowed: isAllowed,
      count: clientData.count,
      maxRequests,
      timeUntilReset,
      resetTime: new Date(clientData.resetTime + windowMs).toISOString()
    };
  }

  // API固有のレート制限
  checkApiLimit(req, endpoint) {
    const limits = {
      // 画像生成API（重いため制限厳しく）
      'generate': { maxRequests: 10, windowMs: 60000 },
      'generate/batch': { maxRequests: 5, windowMs: 60000 },
      
      // URL解析API（中程度）
      'analyze-url': { maxRequests: 20, windowMs: 60000 },
      'analyze-site': { maxRequests: 5, windowMs: 60000 },
      
      // その他のAPI（軽いため制限緩く）
      'default': { maxRequests: 30, windowMs: 60000 }
    };

    const limit = limits[endpoint] || limits['default'];
    return this.checkLimit(req, limit.maxRequests, limit.windowMs);
  }

  // 統計情報取得
  getStats() {
    const now = Date.now();
    let activeClients = 0;
    let totalRequests = 0;

    for (const [clientId, data] of this.requests.entries()) {
      if (now - data.resetTime < 60000) { // 1分以内のアクティブクライアント
        activeClients++;
        totalRequests += data.count;
      }
    }

    return {
      activeClients,
      totalRequests,
      cacheSize: this.requests.size,
      timestamp: new Date().toISOString()
    };
  }
}

// シングルトンインスタンス
const rateLimiter = new RateLimiter();

// Express ミドルウェア
function createRateLimitMiddleware(endpoint) {
  return (req, res, next) => {
    const result = rateLimiter.checkApiLimit(req, endpoint);
    
    // レスポンスヘッダーに制限情報を追加
    res.set({
      'X-RateLimit-Limit': result.maxRequests,
      'X-RateLimit-Remaining': Math.max(0, result.maxRequests - result.count),
      'X-RateLimit-Reset': result.resetTime
    });

    if (!result.allowed) {
      const retryAfter = Math.ceil(result.timeUntilReset / 1000);
      res.set('Retry-After', retryAfter);
      
      return res.status(429).json({
        success: false,
        error: 'レート制限に達しました',
        details: `1分間に${result.maxRequests}回までのリクエストが可能です。${retryAfter}秒後に再試行してください。`,
        retryAfter: retryAfter
      });
    }

    next();
  };
}

module.exports = {
  rateLimiter,
  createRateLimitMiddleware
};