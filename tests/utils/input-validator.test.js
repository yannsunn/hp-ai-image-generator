const {
  validateUrl,
  validatePrompt,
  validateNumber,
  validateApiChoice,
  validateGenerateRequest,
  sanitizeString
} = require('../../api/utils/input-validator');

describe('Input Validator', () => {
  describe('sanitizeString', () => {
    test('should sanitize HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeString(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    test('should handle empty input', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });

    test('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });
  });

  describe('validateUrl', () => {
    test('should validate valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.jp',
        'https://subdomain.example.co.jp'
      ];

      validUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(url);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        ''
      ];

      invalidUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBeTruthy();
      });
    });

    test('should reject private network URLs', () => {
      const privateUrls = [
        'http://localhost:3000',
        'http://127.0.0.1',
        'http://192.168.1.1',
        'http://10.0.0.1'
      ];

      privateUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('内部ネットワーク');
      });
    });

    test('should reject URLs that are too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2048);
      const result = validateUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('長すぎます');
    });
  });

  describe('validatePrompt', () => {
    test('should validate valid prompts', () => {
      const validPrompts = [
        '美しい風景を描いてください',
        'A beautiful landscape with mountains',
        'プロフェッショナルなビジネスマンの写真'
      ];

      validPrompts.forEach(prompt => {
        const result = validatePrompt(prompt);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBeTruthy();
      });
    });

    test('should reject invalid prompts', () => {
      const invalidPrompts = [
        '',
        '  ',
        'ab', // too short
        'a'.repeat(4001), // too long
        '<script>alert(1)</script>',
        'javascript:void(0)'
      ];

      invalidPrompts.forEach(prompt => {
        const result = validatePrompt(prompt);
        expect(result.valid).toBe(false);
        expect(result.error).toBeTruthy();
      });
    });

    test('should sanitize dangerous content', () => {
      const prompt = 'Create an image with <script>alert("test")</script>';
      const result = validatePrompt(prompt);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不正なコンテンツ');
    });
  });

  describe('validateNumber', () => {
    test('should validate numbers within range', () => {
      const result = validateNumber('5', 1, 10);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(5);
    });

    test('should reject numbers outside range', () => {
      const result = validateNumber('15', 1, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('1から10の間');
    });

    test('should reject non-numeric input', () => {
      const result = validateNumber('abc', 1, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('数値である必要');
    });
  });

  describe('validateApiChoice', () => {
    test('should validate valid API choices', () => {
      const validApis = ['auto', 'openai', 'stability', 'replicate'];
      
      validApis.forEach(api => {
        const result = validateApiChoice(api);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(api);
      });
    });

    test('should reject invalid API choices', () => {
      const invalidApis = ['invalid', '', 'midjourney'];
      
      invalidApis.forEach(api => {
        const result = validateApiChoice(api);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('無効なAPI選択');
      });
    });

    test('should handle case insensitive input', () => {
      const result = validateApiChoice('OPENAI');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('openai');
    });
  });

  describe('validateGenerateRequest', () => {
    test('should validate complete valid request', () => {
      const validRequest = {
        prompt: '美しい風景画を生成してください',
        count: 2,
        api: 'openai',
        additionalInstructions: ['高品質で', 'プロフェッショナルな印象'],
        context: {
          industry: 'technology',
          contentType: 'hero'
        }
      };

      const result = validateGenerateRequest(validRequest);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeTruthy();
      expect(result.sanitized.prompt).toBeTruthy();
      expect(result.sanitized.count).toBe(2);
      expect(result.sanitized.api).toBe('openai');
    });

    test('should reject request with invalid prompt', () => {
      const invalidRequest = {
        prompt: '', // empty prompt
        count: 1,
        api: 'openai'
      };

      const result = validateGenerateRequest(invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('プロンプト');
    });

    test('should reject request with invalid count', () => {
      const invalidRequest = {
        prompt: 'valid prompt',
        count: 15, // too high
        api: 'openai'
      };

      const result = validateGenerateRequest(invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('生成枚数');
    });

    test('should sanitize additional instructions', () => {
      const request = {
        prompt: 'valid prompt',
        count: 1,
        api: 'openai',
        additionalInstructions: [
          '有効な指示',
          '<script>alert("xss")</script>', // should be rejected
          '別の有効な指示'
        ]
      };

      const result = validateGenerateRequest(request);
      expect(result.valid).toBe(true);
      expect(result.sanitized.additionalInstructions).toHaveLength(2); // XSS instruction filtered out
    });
  });
});