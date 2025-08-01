import logger from './logger';

interface EnvConfig {
  required: string[];
  optional: string[];
}

const ENV_CONFIG: EnvConfig = {
  required: [
    'NODE_ENV',
    // At least one API key is required
  ],
  optional: [
    'OPENAI_API_KEY',
    'STABILITY_API_KEY', 
    'REPLICATE_API_TOKEN',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'CORS_ORIGIN',
    'LOG_LEVEL',
    'RATE_LIMIT_MS',
    'API_TIMEOUT_MS',
    'MAX_BATCH_SIZE',
    'MAX_ANALYZE_PAGES'
  ]
};

export class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  validate(): void {
    this.validateRequired();
    this.validateApiKeys();
    this.validateOptional();
    this.validateSecuritySettings();
    
    if (this.errors.length > 0) {
      logger.error('Environment validation failed:', this.errors);
      throw new Error(`Environment validation failed:\n${this.errors.join('\n')}`);
    }

    if (this.warnings.length > 0) {
      logger.warn('Environment validation warnings:', this.warnings);
    }

    logger.info('Environment validation successful');
  }

  private validateRequired(): void {
    ENV_CONFIG.required.forEach(key => {
      if (!process.env[key]) {
        this.errors.push(`Missing required environment variable: ${key}`);
      }
    });
  }

  private validateApiKeys(): void {
    const apiKeys = [
      'OPENAI_API_KEY',
      'STABILITY_API_KEY',
      'REPLICATE_API_TOKEN'
    ];

    const hasAnyKey = apiKeys.some(key => process.env[key]);
    
    if (!hasAnyKey) {
      this.errors.push('At least one API key must be configured (OPENAI_API_KEY, STABILITY_API_KEY, or REPLICATE_API_TOKEN)');
    }

    // Validate API key formats
    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
      this.warnings.push('OPENAI_API_KEY should start with "sk-"');
    }

    if (process.env.REPLICATE_API_TOKEN && !process.env.REPLICATE_API_TOKEN.startsWith('r8_')) {
      this.warnings.push('REPLICATE_API_TOKEN should start with "r8_"');
    }
  }

  private validateOptional(): void {
    // Validate numeric values
    const numericKeys = [
      'RATE_LIMIT_MS',
      'API_TIMEOUT_MS',
      'MAX_BATCH_SIZE',
      'MAX_ANALYZE_PAGES'
    ];

    numericKeys.forEach(key => {
      const value = process.env[key];
      if (value && isNaN(Number(value))) {
        this.errors.push(`${key} must be a valid number, got: ${value}`);
      }
    });

    // Validate LOG_LEVEL
    if (process.env.LOG_LEVEL) {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(process.env.LOG_LEVEL)) {
        this.warnings.push(`Invalid LOG_LEVEL: ${process.env.LOG_LEVEL}. Valid values: ${validLevels.join(', ')}`);
      }
    }

    // Validate NODE_ENV
    const validEnvs = ['development', 'production', 'test'];
    if (!validEnvs.includes(process.env.NODE_ENV!)) {
      this.warnings.push(`Unusual NODE_ENV: ${process.env.NODE_ENV}. Common values: ${validEnvs.join(', ')}`);
    }
  }

  private validateSecuritySettings(): void {
    // Production security checks
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.CORS_ORIGIN) {
        this.errors.push('CORS_ORIGIN must be set in production');
      }

      if (process.env.LOG_LEVEL === 'debug') {
        this.warnings.push('Debug logging should be disabled in production');
      }

      // Check for secure API endpoints
      if (process.env.CORS_ORIGIN && !process.env.CORS_ORIGIN.startsWith('https://')) {
        this.warnings.push('CORS_ORIGIN should use HTTPS in production');
      }
    }

    // Check for exposed secrets
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /private/i,
      /token/i,
      /key/i
    ];

    Object.keys(process.env).forEach(key => {
      if (sensitivePatterns.some(pattern => pattern.test(key))) {
        const value = process.env[key]!;
        if (value.length < 20) {
          this.warnings.push(`${key} appears to be a sensitive value but seems too short (${value.length} chars)`);
        }
      }
    });
  }

  getReport(): { errors: string[]; warnings: string[] } {
    return {
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

// Export singleton instance
export const envValidator = new EnvironmentValidator();