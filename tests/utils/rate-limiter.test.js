const rateLimiter = require('../../api/utils/rate-limiter');

// モックレスポンスオブジェクト
const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  setHeader: jest.fn().mockReturnThis()
});

describe('Rate Limiter', () => {
  beforeEach(() => {
    // 各テスト前にレート制限をリセット
    rateLimiter.reset();
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    test('should allow requests within limit', () => {
      const req = { ip: '127.0.0.1' };
      const res = createMockRes();
      
      const result = rateLimiter.checkRateLimit(req, res, 'generate');
      
      expect(result).toBe(true);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should block requests exceeding limit', () => {
      const req = { ip: '127.0.0.1' };
      const res = createMockRes();
      
      // 制限を超えるまでリクエストを送信
      for (let i = 0; i < 15; i++) { // generateの制限は10回/分
        rateLimiter.checkRateLimit(req, res, 'generate');
      }
      
      // 11回目のリクエストでブロックされるはず
      const result = rateLimiter.checkRateLimit(req, res, 'generate');
      
      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('レート制限')
        })
      );
    });

    test('should handle different endpoints with different limits', () => {
      const req = { ip: '127.0.0.1' };
      const res = createMockRes();
      
      // 通常の生成エンドポイント (10回/分)
      for (let i = 0; i < 10; i++) {
        const result = rateLimiter.checkRateLimit(req, res, 'generate');
        expect(result).toBe(true);
      }
      
      // バッチエンドポイント (5回/分)
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.checkRateLimit(req, res, 'generate/batch');
        expect(result).toBe(true);
      }
      
      // 11回目の通常生成はブロック
      expect(rateLimiter.checkRateLimit(req, res, 'generate')).toBe(false);
      
      // 6回目のバッチはブロック
      expect(rateLimiter.checkRateLimit(req, res, 'generate/batch')).toBe(false);
    });

    test('should handle different IPs independently', () => {
      const req1 = { ip: '127.0.0.1' };
      const req2 = { ip: '192.168.1.1' };
      const res = createMockRes();
      
      // IP1で制限まで使用
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.checkRateLimit(req1, res, 'generate')).toBe(true);
      }
      
      // IP1は制限に達している
      expect(rateLimiter.checkRateLimit(req1, res, 'generate')).toBe(false);
      
      // IP2はまだ使用可能
      expect(rateLimiter.checkRateLimit(req2, res, 'generate')).toBe(true);
    });

    test('should use fallback IP when req.ip is not available', () => {
      const req = {}; // IP情報なし
      const res = createMockRes();
      
      const result = rateLimiter.checkRateLimit(req, res, 'generate');
      expect(result).toBe(true);
    });

    test('should handle unknown endpoints with default limit', () => {
      const req = { ip: '127.0.0.1' };
      const res = createMockRes();
      
      const result = rateLimiter.checkRateLimit(req, res, 'unknown-endpoint');
      expect(result).toBe(true);
    });
  });

  describe('cleanup', () => {
    test('should remove expired entries', (done) => {
      const req = { ip: '127.0.0.1' };
      const res = createMockRes();
      
      // リクエストを1つ作成
      rateLimiter.checkRateLimit(req, res, 'generate');
      
      // 即座にクリーンアップを実行 (通常は10分間隔)
      rateLimiter.cleanup();
      
      // 少し待ってからクリーンアップが動作することを確認
      setTimeout(() => {
        // クリーンアップ後でも新しいリクエストは正常に処理される
        const result = rateLimiter.checkRateLimit(req, res, 'generate');
        expect(result).toBe(true);
        done();
      }, 100);
    });
  });

  describe('reset', () => {
    test('should clear all rate limit data', () => {
      const req = { ip: '127.0.0.1' };
      const res = createMockRes();
      
      // 制限まで使用
      for (let i = 0; i < 10; i++) {
        rateLimiter.checkRateLimit(req, res, 'generate');
      }
      
      // 制限に達している
      expect(rateLimiter.checkRateLimit(req, res, 'generate')).toBe(false);
      
      // リセット実行
      rateLimiter.reset();
      
      // リセット後は再び使用可能
      expect(rateLimiter.checkRateLimit(req, res, 'generate')).toBe(true);
    });
  });

  describe('rate limit headers', () => {
    test('should set rate limit headers', () => {
      const req = { ip: '127.0.0.1' };
      const res = createMockRes();
      
      rateLimiter.checkRateLimit(req, res, 'generate');
      
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });
  });
});