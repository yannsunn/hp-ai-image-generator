// API設定
const config = {
  // CORS設定
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    headers: [
      'X-CSRF-Token',
      'X-Requested-With',
      'Accept',
      'Accept-Version',
      'Content-Length',
      'Content-MD5',
      'Content-Type',
      'Date',
      'X-Api-Version',
      'X-User-Id'
    ]
  },

  // API料金設定（USD）
  pricing: {
    openai: {
      'dall-e-3': {
        standard: 0.040,
        hd: 0.080
      }
    },
    stability: {
      'sdxl': 0.018,
      'sd-1.5': 0.012
    },
    replicate: {
      'sdxl': 0.005,
      'sd-1.5': 0.003
    }
  },

  // API設定
  api: {
    // レート制限（ミリ秒）
    rateLimit: parseInt(process.env.RATE_LIMIT_MS || '500'),
    // タイムアウト（ミリ秒）
    timeout: parseInt(process.env.API_TIMEOUT_MS || '120000'),
    // 最大生成枚数
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '8'),
    // 最大解析ページ数
    maxAnalyzePages: parseInt(process.env.MAX_ANALYZE_PAGES || '10')
  },

  // ログ設定
  logging: {
    level: process.env.LOG_LEVEL || 'error', // 'debug', 'info', 'warn', 'error'
    enabled: process.env.NODE_ENV !== 'test'
  },

  // 環境設定
  env: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test'
  }
};

module.exports = config;