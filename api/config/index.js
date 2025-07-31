// API設定
const config = {
  // CORS設定（セキュア）
  cors: {
    origin: function(origin, callback) {
      // 開発環境では全てのoriginを許可
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // 本番環境では明示的に許可されたoriginのみ
      const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean);
      
      // originが未定義（サーバー間通信）またはallowedOriginsに含まれる場合のみ許可
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation: Origin not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'X-Requested-With',
      'X-User-Id'
    ],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400, // 24時間
    optionsSuccessStatus: 200
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