const { rateLimiter } = require('../../api/utils/rate-limiter');

describe('Rate Limiter', () => {
  // テスト用のreqオブジェクトを作成
  const createReq = (ip = '127.0.0.1', userAgent = 'test-agent') => ({
    ip,
    headers: {
      'user-agent': userAgent,
      'x-forwarded-for': ip
    },
    connection: { remoteAddress: ip }
  });

  beforeEach(() => {
    // テスト間でのクロスコンタミネーションを防ぐため、
    // Map をクリアする（実装に応じて調整）
    if (rateLimiter.requests) {
      rateLimiter.requests.clear();
    }
    jest.clearAllMocks();
  });

  describe('checkApiLimit', () => {
    test('should allow first request', () => {
      const req = createReq();
      
      const result = rateLimiter.checkApiLimit(req, 'generate');
      
      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);
      expect(result.maxRequests).toBe(10);
    });

    test('should track multiple requests', () => {
      const req = createReq();
      
      // 複数回リクエスト
      const result1 = rateLimiter.checkApiLimit(req, 'generate');
      const result2 = rateLimiter.checkApiLimit(req, 'generate');
      const result3 = rateLimiter.checkApiLimit(req, 'generate');
      
      expect(result1.count).toBe(1);
      expect(result2.count).toBe(2);
      expect(result3.count).toBe(3);
      expect(result3.allowed).toBe(true);
    });

    test('should have different limits for different endpoints', () => {
      const req = createReq();
      
      const generateResult = rateLimiter.checkApiLimit(req, 'generate');
      const batchResult = rateLimiter.checkApiLimit(req, 'generate/batch');
      const defaultResult = rateLimiter.checkApiLimit(req, 'unknown');
      
      expect(generateResult.maxRequests).toBe(10);
      expect(batchResult.maxRequests).toBe(5);
      expect(defaultResult.maxRequests).toBe(30);
    });

    test('should handle different client IDs independently', () => {
      const req1 = createReq('127.0.0.1', 'agent1');
      const req2 = createReq('192.168.1.1', 'agent2');
      
      const result1 = rateLimiter.checkApiLimit(req1, 'generate');
      const result2 = rateLimiter.checkApiLimit(req2, 'generate');
      
      expect(result1.count).toBe(1);
      expect(result2.count).toBe(1); // 異なるクライアントなので独立
    });

    test('should return proper structure', () => {
      const req = createReq();
      
      const result = rateLimiter.checkApiLimit(req, 'generate');
      
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('maxRequests');
      expect(result).toHaveProperty('timeUntilReset');
      expect(result).toHaveProperty('resetTime');
      
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.count).toBe('number');
      expect(typeof result.maxRequests).toBe('number');
      expect(typeof result.timeUntilReset).toBe('number');
      expect(typeof result.resetTime).toBe('string');
    });
  });

  describe('getClientId', () => {
    test('should generate client ID from IP and user agent', () => {
      const req = createReq('192.168.1.100', 'Mozilla/5.0');
      
      const clientId = rateLimiter.getClientId(req);
      
      expect(clientId).toContain('192.168.1.100');
      expect(clientId).toContain('Mozilla/5.0');
    });

    test('should handle missing headers gracefully', () => {
      const req = { headers: {} };
      
      const clientId = rateLimiter.getClientId(req);
      
      expect(typeof clientId).toBe('string');
      expect(clientId.length).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    test('should have cleanup method', () => {
      expect(typeof rateLimiter.cleanup).toBe('function');
    });

    test('should execute cleanup without errors', () => {
      expect(() => {
        rateLimiter.cleanup();
      }).not.toThrow();
    });
  });

  describe('getStats', () => {
    test('should return statistics', () => {
      const req = createReq();
      
      // いくつかリクエストを作成
      rateLimiter.checkApiLimit(req, 'generate');
      rateLimiter.checkApiLimit(req, 'generate');
      
      const stats = rateLimiter.getStats();
      
      expect(stats).toHaveProperty('activeClients');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('timestamp');
      
      expect(typeof stats.activeClients).toBe('number');
      expect(typeof stats.totalRequests).toBe('number');
      expect(typeof stats.cacheSize).toBe('number');
      expect(typeof stats.timestamp).toBe('string');
    });
  });
});