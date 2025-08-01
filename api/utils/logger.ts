import config from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private readonly level: number;
  private readonly enabled: boolean;

  constructor() {
    this.level = logLevels[config.logging.level] || logLevels.error;
    this.enabled = config.logging.enabled;
  }

  debug(...args: unknown[]): void {
    if (this.enabled && this.level <= logLevels.debug) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.enabled && this.level <= logLevels.info) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.enabled && this.level <= logLevels.warn) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.enabled && this.level <= logLevels.error) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  }
}

export default new Logger();