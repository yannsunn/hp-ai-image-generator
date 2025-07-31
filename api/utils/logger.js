const config = require('../config');

const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  constructor() {
    this.level = logLevels[config.logging.level] || logLevels.error;
    this.enabled = config.logging.enabled;
  }

  debug(...args) {
    if (this.enabled && this.level <= logLevels.debug) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  }

  info(...args) {
    if (this.enabled && this.level <= logLevels.info) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  }

  warn(...args) {
    if (this.enabled && this.level <= logLevels.warn) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  }

  error(...args) {
    if (this.enabled && this.level <= logLevels.error) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  }
}

module.exports = new Logger();