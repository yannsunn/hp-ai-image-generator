// 設定ファイル
const isDevelopment = process.env.NODE_ENV === 'development';

module.exports = {
  env: {
    isDevelopment,
    isProduction: !isDevelopment
  },
  cors: {
    credentials: 'true',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-User-Id', 'Authorization'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: '86400'
  },
  allowedOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://hp-ai-gen.vercel.app',
    'https://hp-ai-image-generator.vercel.app',
    'https://hp-ai-image-gen.vercel.app',
    /^https:\/\/hp-ai-[a-zA-Z0-9-]+\.vercel\.app$/
  ],

  // API制限設定
  limits: {
    maxPromptLength: parseInt(process.env.MAX_PROMPT_LENGTH) || 5000,
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE) || 8,
    maxAnalyzePages: parseInt(process.env.MAX_ANALYZE_PAGES) || 10,
    apiTimeout: parseInt(process.env.API_TIMEOUT_MS) || 120000,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10
  },

  // キャッシュ設定
  cache: {
    analysisTTL: parseInt(process.env.CACHE_ANALYSIS_TTL) || 86400, // 24時間
    promptTTL: parseInt(process.env.CACHE_PROMPT_TTL) || 3600 // 1時間
  }
};