/**
 * Logging Utility
 * Provides structured logging with different log levels
 */

const config = require('../config');

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gray
  RESET: '\x1b[0m'
};

class Logger {
  constructor() {
    this.isProduction = config.isProduction;
  }

  /**
   * Formats log message with timestamp and level
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const color = COLORS[level] || '';
    const reset = COLORS.RESET;

    let logMessage = `${color}[${timestamp}] [${level}]${reset} ${message}`;

    if (data) {
      logMessage += `\n${JSON.stringify(data, null, 2)}`;
    }

    return logMessage;
  }

  /**
   * Logs error messages
   */
  error(message, error = null) {
    const data = error ? {
      message: error.message,
      stack: error.stack,
      ...(error.code && { code: error.code })
    } : null;

    console.error(this.formatMessage(LOG_LEVELS.ERROR, message, data));
  }

  /**
   * Logs warning messages
   */
  warn(message, data = null) {
    console.warn(this.formatMessage(LOG_LEVELS.WARN, message, data));
  }

  /**
   * Logs informational messages
   */
  info(message, data = null) {
    console.log(this.formatMessage(LOG_LEVELS.INFO, message, data));
  }

  /**
   * Logs debug messages (only in development)
   */
  debug(message, data = null) {
    if (!this.isProduction) {
      console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, data));
    }
  }

  /**
   * Logs HTTP request information
   */
  request(req, res, responseTime) {
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    const message = `${method} ${originalUrl} ${statusCode} - ${responseTime}ms - ${ip}`;

    if (statusCode >= 500) {
      this.error(message);
    } else if (statusCode >= 400) {
      this.warn(message);
    } else {
      this.debug(message);
    }
  }

  /**
   * Logs database operations (only in development)
   */
  db(operation, table, data = null) {
    if (!this.isProduction) {
      this.debug(`DB ${operation} on ${table}`, data);
    }
  }
}

// Export singleton instance
module.exports = new Logger();
