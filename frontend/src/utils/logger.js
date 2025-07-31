// フロントエンド用ロガー
class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = import.meta.env.VITE_LOG_LEVEL || 'error';
  }

  debug(...args) {
    if (this.isDevelopment && this.shouldLog('debug')) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  }

  info(...args) {
    if (this.shouldLog('info')) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  }

  warn(...args) {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  }

  error(...args) {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  }

  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.logLevel] || levels.error;
    const messageLevel = levels[level] || levels.error;
    return messageLevel >= currentLevel;
  }
}

export default new Logger();