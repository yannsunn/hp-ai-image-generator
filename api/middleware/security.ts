import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import logger from '../utils/logger';

// Content Security Policy設定
export const contentSecurityPolicy = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.stability.ai", "https://api.replicate.com"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      childSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined
    }
  },
  crossOriginEmbedderPolicy: false, // 画像生成APIとの互換性のため
});

// セキュリティヘッダー設定
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // その他のセキュリティヘッダー
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  next();
};

// APIキー検証ミドルウェア
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  // 開発環境ではスキップ
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    logger.warn('API request without API key', { 
      ip: req.ip,
      path: req.path 
    });
    res.status(401).json({ error: 'API key required' });
    return;
  }

  // 本番環境では実際のAPIキー検証を実装
  // ここでは簡易的な実装
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    logger.error('Invalid API key attempt', { 
      ip: req.ip,
      path: req.path 
    });
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  next();
};

// リクエストサニタイゼーション
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  // XSS対策: リクエストボディのサニタイゼーション
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // SQLインジェクション対策: クエリパラメータのサニタイゼーション
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
};

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    // 危険な文字列パターンを除去
    return obj
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

// IPアドレス制限（オプション）
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logger.warn('Blocked request from unauthorized IP', { 
        ip: clientIP,
        path: req.path 
      });
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    next();
  };
};