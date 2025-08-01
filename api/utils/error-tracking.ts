import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import logger from './logger';

interface ErrorContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export class ErrorTracker {
  private initialized = false;

  init(): void {
    if (this.initialized || !process.env.SENTRY_DSN) {
      return;
    }

    try {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        integrations: [
          new ProfilingIntegration(),
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({
            router: true,
            methods: true,
          }),
        ],
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend(event, hint) {
          // センシティブ情報のフィルタリング
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers['x-api-key'];
          }
          
          if (event.extra) {
            Object.keys(event.extra).forEach(key => {
              if (key.toLowerCase().includes('key') || 
                  key.toLowerCase().includes('token') ||
                  key.toLowerCase().includes('password')) {
                event.extra![key] = '[REDACTED]';
              }
            });
          }

          return event;
        },
      });

      this.initialized = true;
      logger.info('Sentry error tracking initialized');
    } catch (error) {
      logger.error('Failed to initialize Sentry:', error);
    }
  }

  captureError(error: Error, context?: ErrorContext): void {
    logger.error('Error captured:', error, context);

    if (!this.initialized) {
      return;
    }

    Sentry.captureException(error, {
      tags: {
        endpoint: context?.endpoint,
        method: context?.method,
      },
      user: context?.userId ? { id: context.userId } : undefined,
      extra: context,
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    logger[level](message, context);

    if (!this.initialized) {
      return;
    }

    Sentry.captureMessage(message, level, {
      tags: {
        endpoint: context?.endpoint,
        method: context?.method,
      },
      extra: context,
    });
  }

  setUserContext(userId: string, userData?: Record<string, any>): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser({
      id: userId,
      ...userData,
    });
  }

  clearUserContext(): void {
    if (!this.initialized) {
      return;
    }

    Sentry.setUser(null);
  }

  createTransaction(name: string, op: string): any {
    if (!this.initialized) {
      return null;
    }

    return Sentry.startTransaction({
      name,
      op,
    });
  }
}

export const errorTracker = new ErrorTracker();

// カスタムエラークラス
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: any) {
    super(message, 400, true, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: any) {
    super(message, 401, true, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context?: any) {
    super(message, 403, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: any) {
    super(message, 404, true, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: any) {
    super(message, 429, true, context);
  }
}

export class ExternalAPIError extends AppError {
  constructor(message: string, context?: any) {
    super(message, 502, true, context);
  }
}