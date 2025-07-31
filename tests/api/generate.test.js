const request = require('supertest');
const { createServer } = require('http');
const generateHandler = require('../../api/generate');

// モックの設定
jest.mock('../../api/utils/input-validator', () => ({
  validateGenerateRequest: jest.fn()
}));

jest.mock('../../api/utils/rate-limiter', () => ({
  checkRateLimit: jest.fn()
}));

jest.mock('../../api/utils/image-generators', () => ({
  generateWithOpenAI: jest.fn(),
  generateWithStability: jest.fn(),
  generateWithReplicate: jest.fn()
}));

jest.mock('../../api/utils/response-helpers', () => ({
  setCorsHeaders: jest.fn(),
  sendErrorResponse: jest.fn((res, status, message) => {
    res.status(status).json({ success: false, error: message });
  }),
  sendSuccessResponse: jest.fn((res, data) => {
    res.json({ success: true, ...data });
  })
}));

const { validateGenerateRequest } = require('../../api/utils/input-validator');
const { checkRateLimit } = require('../../api/utils/rate-limiter');
const {
  generateWithOpenAI,
  generateWithStability,
  generateWithReplicate
} = require('../../api/utils/image-generators');

describe('/api/generate', () => {
  let app;
  
  beforeEach(() => {
    app = createServer(generateHandler);
    jest.clearAllMocks();
    
    // デフォルトのモック設定
    checkRateLimit.mockReturnValue(true);
    validateGenerateRequest.mockReturnValue({
      valid: true,
      sanitized: {
        prompt: 'test prompt',
        count: 1,
        api: 'auto',
        additionalInstructions: [],
        context: {}
      }
    });
  });

  describe('OPTIONS request', () => {
    test('should handle OPTIONS request', async () => {
      const response = await request(app)
        .options('/')
        .expect(200);
    });
  });

  describe('POST request validation', () => {
    test('should reject invalid request format', async () => {
      validateGenerateRequest.mockReturnValue({
        valid: false,
        error: 'プロンプトが提供されていません'
      });

      const response = await request(app)
        .post('/')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('プロンプト');
    });

    test('should reject when rate limit exceeded', async () => {
      checkRateLimit.mockReturnValue(false);

      const response = await request(app)
        .post('/')
        .send({
          prompt: 'test prompt',
          api: 'openai',
          count: 1
        });

      // レート制限の場合、レスポンスは rate-limiter内で処理される
      expect(checkRateLimit).toHaveBeenCalled();
    });
  });

  describe('Image generation', () => {
    test('should generate image with OpenAI when specified', async () => {
      validateGenerateRequest.mockReturnValue({
        valid: true,
        sanitized: {
          prompt: 'test prompt',
          count: 1,
          api: 'openai',
          additionalInstructions: [],
          context: {}
        }
      });

      generateWithOpenAI.mockResolvedValue({
        image: 'base64-image-data',
        cost: 0.02
      });

      const response = await request(app)
        .post('/')
        .send({
          prompt: 'test prompt',
          api: 'openai',
          count: 1
        })
        .expect(200);

      expect(generateWithOpenAI).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
      expect(response.body.image).toBe('base64-image-data');
    });

    test('should generate image with Stability AI when specified', async () => {
      validateGenerateRequest.mockReturnValue({
        valid: true,
        sanitized: {
          prompt: 'test prompt',
          count: 1,
          api: 'stability',
          additionalInstructions: [],
          context: {}
        }
      });

      generateWithStability.mockResolvedValue({
        image: 'base64-image-data',
        cost: 0.03
      });

      const response = await request(app)
        .post('/')
        .send({
          prompt: 'test prompt',
          api: 'stability',
          count: 1
        })
        .expect(200);

      expect(generateWithStability).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    test('should generate image with Replicate when specified', async () => {
      validateGenerateRequest.mockReturnValue({
        valid: true,
        sanitized: {
          prompt: 'test prompt',
          count: 1,
          api: 'replicate',
          additionalInstructions: [],
          context: {}
        }
      });

      generateWithReplicate.mockResolvedValue({
        image: 'base64-image-data',
        cost: 0.01
      });

      const response = await request(app)
        .post('/')
        .send({
          prompt: 'test prompt',
          api: 'replicate',
          count: 1
        })
        .expect(200);

      expect(generateWithReplicate).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    test('should auto-select API when api is "auto"', async () => {
      validateGenerateRequest.mockReturnValue({
        valid: true,
        sanitized: {
          prompt: 'test prompt',
          count: 1,
          api: 'auto',
          additionalInstructions: [],
          context: { contentType: 'hero' }
        }
      });

      // auto選択時はOpenAIがデフォルト
      generateWithOpenAI.mockResolvedValue({
        image: 'base64-image-data',
        cost: 0.02
      });

      const response = await request(app)
        .post('/')
        .send({
          prompt: 'test prompt',
          api: 'auto',
          count: 1,
          context: { contentType: 'hero' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle API generation errors gracefully', async () => {
      validateGenerateRequest.mockReturnValue({
        valid: true,
        sanitized: {
          prompt: 'test prompt',
          count: 1,
          api: 'openai',
          additionalInstructions: [],
          context: {}
        }
      });

      generateWithOpenAI.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/')
        .send({
          prompt: 'test prompt',
          api: 'openai',
          count: 1
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('API Error');
    });
  });

  describe('Prompt enhancement', () => {
    test('should enhance Japanese prompts to English', async () => {
      validateGenerateRequest.mockReturnValue({
        valid: true,
        sanitized: {
          prompt: '美しい風景',
          count: 1,
          api: 'openai',
          additionalInstructions: ['高品質で'],
          context: { industry: 'tourism' }
        }
      });

      generateWithOpenAI.mockResolvedValue({
        image: 'base64-image-data',
        cost: 0.02
      });

      await request(app)
        .post('/')
        .send({
          prompt: '美しい風景',
          api: 'openai',
          additionalInstructions: ['高品質で'],
          context: { industry: 'tourism' }
        })
        .expect(200);

      const callArgs = generateWithOpenAI.mock.calls[0];
      const enhancedPrompt = callArgs[0];
      
      // 英語に変換されていることを確認
      expect(enhancedPrompt).toMatch(/beautiful|landscape|scenery/i);
      expect(enhancedPrompt).toMatch(/high.quality|professional/i);
    });

    test('should include industry context in prompt', async () => {
      validateGenerateRequest.mockReturnValue({
        valid: true,
        sanitized: {
          prompt: 'オフィス風景',
          count: 1,
          api: 'openai',
          additionalInstructions: [],
          context: { 
            industry: 'technology',
            contentType: 'hero'
          }
        }
      });

      generateWithOpenAI.mockResolvedValue({
        image: 'base64-image-data',
        cost: 0.02
      });

      await request(app)
        .post('/')
        .send({
          prompt: 'オフィス風景',
          api: 'openai',
          context: { 
            industry: 'technology',
            contentType: 'hero'
          }
        })
        .expect(200);

      const callArgs = generateWithOpenAI.mock.calls[0];
      const enhancedPrompt = callArgs[0];
      
      // テクノロジー業界の要素が含まれていることを確認
      expect(enhancedPrompt).toMatch(/technology|tech|digital|modern/i);
    });
  });

  describe('Unsupported methods', () => {
    test('should reject GET requests', async () => {
      const response = await request(app)
        .get('/')
        .expect(405);
    });

    test('should reject PUT requests', async () => {
      const response = await request(app)
        .put('/')
        .expect(405);
    });
  });
});