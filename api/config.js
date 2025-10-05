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
  ]
};