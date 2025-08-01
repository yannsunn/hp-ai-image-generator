import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { Request, Response } from 'express';
import handler from '../../api/generate';
import { validateGenerateRequest } from '../../api/utils/input-validator';
import { rateLimiter } from '../../api/utils/rate-limiter';
import * as imageGenerators from '../../api/utils/image-generators';

// Mock dependencies
jest.mock('../../api/utils/input-validator');
jest.mock('../../api/utils/rate-limiter');
jest.mock('../../api/utils/image-generators');
jest.mock('../../api/utils/logger');

describe('Generate API', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSetHeader: jest.Mock;
  let mockEnd: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup response mocks
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockSetHeader = jest.fn().mockReturnThis();
    mockEnd = jest.fn().mockReturnThis();

    mockRes = {
      json: mockJson,
      status: mockStatus,
      setHeader: mockSetHeader,
      end: mockEnd,
    };

    // Default request
    mockReq = {
      method: 'POST',
      body: {
        prompt: 'test prompt',
        api: 'openai',
        additionalInstructions: [],
      },
      headers: {},
    };

    // Default mocks
    (validateGenerateRequest as jest.Mock).mockReturnValue({
      valid: true,
      sanitized: {
        prompt: 'test prompt',
        api: 'openai',
        additionalInstructions: [],
        context: {},
        count: 1,
      },
    });

    (rateLimiter.checkApiLimit as jest.Mock).mockReturnValue({
      allowed: true,
      maxRequests: 10,
      timeUntilReset: 60000,
    });

    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.STABILITY_API_KEY;
    delete process.env.REPLICATE_API_TOKEN;
  });

  describe('Request validation', () => {
    it('should handle valid POST request', async () => {
      const mockImage = 'https://example.com/image.png';
      (imageGenerators.generateWithOpenAI as jest.Mock).mockResolvedValue({
        image: mockImage,
        cost: 0.02,
      });

      await handler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            image: mockImage,
            metadata: expect.objectContaining({
              original_prompt: 'test prompt',
              api_used: 'openai',
              cost: 0.02,
            }),
          }),
        })
      );
    });

    it('should reject non-POST requests', async () => {
      mockReq.method = 'GET';

      await handler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(405);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Method not allowed',
        })
      );
    });

    it('should handle OPTIONS request', async () => {
      mockReq.method = 'OPTIONS';

      await handler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe('Input validation', () => {
    it('should reject invalid input', async () => {
      (validateGenerateRequest as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Invalid prompt',
      });

      await handler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid prompt',
        })
      );
    });

    it('should sanitize input', async () => {
      mockReq.body = {
        prompt: '<script>alert("xss")</script>test prompt',
        api: 'openai',
      };

      (validateGenerateRequest as jest.Mock).mockReturnValue({
        valid: true,
        sanitized: {
          prompt: 'test prompt',
          api: 'openai',
          additionalInstructions: [],
          context: {},
          count: 1,
        },
      });

      const mockImage = 'https://example.com/image.png';
      (imageGenerators.generateWithOpenAI as jest.Mock).mockResolvedValue({
        image: mockImage,
        cost: 0.02,
      });

      await handler(mockReq as Request, mockRes as Response);

      expect(validateGenerateRequest).toHaveBeenCalledWith(mockReq.body);
      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits', async () => {
      (rateLimiter.checkApiLimit as jest.Mock).mockReturnValue({
        allowed: false,
        maxRequests: 10,
        timeUntilReset: 30000,
      });

      await handler(mockReq as Request, mockRes as Response);

      expect(mockSetHeader).toHaveBeenCalledWith('Retry-After', '30');
      expect(mockStatus).toHaveBeenCalledWith(429);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'レート制限に達しました',
        })
      );
    });
  });

  describe('API provider selection', () => {
    it('should use OpenAI when specified', async () => {
      const mockImage = 'https://example.com/openai.png';
      (imageGenerators.generateWithOpenAI as jest.Mock).mockResolvedValue({
        image: mockImage,
        cost: 0.02,
      });

      await handler(mockReq as Request, mockRes as Response);

      expect(imageGenerators.generateWithOpenAI).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              api_used: 'openai',
            }),
          }),
        })
      );
    });

    it('should use Stability when specified', async () => {
      process.env.STABILITY_API_KEY = 'test-stability-key';
      mockReq.body.api = 'stability';
      
      (validateGenerateRequest as jest.Mock).mockReturnValue({
        valid: true,
        sanitized: {
          prompt: 'test prompt',
          api: 'stability',
          additionalInstructions: [],
          context: {},
          count: 1,
        },
      });

      const mockImage = 'https://example.com/stability.png';
      (imageGenerators.generateWithStability as jest.Mock).mockResolvedValue({
        image: mockImage,
        cost: 0.018,
      });

      await handler(mockReq as Request, mockRes as Response);

      expect(imageGenerators.generateWithStability).toHaveBeenCalled();
    });

    it('should auto-select available API', async () => {
      mockReq.body.api = 'auto';
      
      (validateGenerateRequest as jest.Mock).mockReturnValue({
        valid: true,
        sanitized: {
          prompt: 'test prompt',
          api: 'auto',
          additionalInstructions: [],
          context: {},
          count: 1,
        },
      });

      const mockImage = 'https://example.com/auto.png';
      (imageGenerators.generateWithOpenAI as jest.Mock).mockResolvedValue({
        image: mockImage,
        cost: 0.02,
      });

      await handler(mockReq as Request, mockRes as Response);

      expect(imageGenerators.generateWithOpenAI).toHaveBeenCalled();
    });

    it('should fail when no API keys are available', async () => {
      delete process.env.OPENAI_API_KEY;
      mockReq.body.api = 'auto';
      
      (validateGenerateRequest as jest.Mock).mockReturnValue({
        valid: true,
        sanitized: {
          prompt: 'test prompt',
          api: 'auto',
          additionalInstructions: [],
          context: {},
          count: 1,
        },
      });

      await handler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('APIキーが設定されていません'),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API rate limit exceeded');
      (imageGenerators.generateWithOpenAI as jest.Mock).mockRejectedValue(apiError);

      await handler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('画像生成に失敗しました'),
        })
      );
    });

    it('should handle unexpected errors', async () => {
      (validateGenerateRequest as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await handler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('サーバーエラー'),
        })
      );
    });
  });

  describe('Japanese prompt enhancement', () => {
    it('should translate Japanese additional instructions', async () => {
      mockReq.body.additionalInstructions = ['高画質', 'プロフェッショナル'];
      
      (validateGenerateRequest as jest.Mock).mockReturnValue({
        valid: true,
        sanitized: {
          prompt: 'test prompt',
          api: 'openai',
          additionalInstructions: ['高画質', 'プロフェッショナル'],
          context: {},
          count: 1,
        },
      });

      const mockImage = 'https://example.com/enhanced.png';
      (imageGenerators.generateWithOpenAI as jest.Mock).mockResolvedValue({
        image: mockImage,
        cost: 0.02,
      });

      await handler(mockReq as Request, mockRes as Response);

      expect(imageGenerators.enhancePromptForJapan).toHaveBeenCalled();
    });
  });
});