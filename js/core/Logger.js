class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
    }

    this.currentLevel = this.levels.INFO
    this.enableTimestamp = true
    this.enableColors = true

    this.colors = {
      ERROR: "#ff4757",
      WARN: "#ffa502",
      INFO: "#3742fa",
      DEBUG: "#2ed573",
    }
  }

  /**
   * Set the current log level
   * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
   */
  setLevel(level) {
    if (this.levels.hasOwnProperty(level)) {
      this.currentLevel = this.levels[level]
    }
  }

  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data
   * @returns {string} Formatted message
   */
  formatMessage(level, message, data) {
    let formatted = ""

    if (this.enableTimestamp) {
      const timestamp = new Date().toISOString()
      formatted += `[${timestamp}] `
    }

    formatted += `[${level}] ${message}`

    if (data !== undefined) {
      formatted += ` | Data: ${JSON.stringify(data)}`
    }

    return formatted
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {any} data - Additional data
   */
  error(message, data) {
    if (this.currentLevel >= this.levels.ERROR) {
      const formatted = this.formatMessage("ERROR", message, data)
      if (this.enableColors) {
        console.error(`%c${formatted}`, `color: ${this.colors.ERROR}`)
      } else {
        console.error(formatted)
      }

      // Emit error event for error handling
      if (typeof EventBus !== "undefined") {
        EventBus.emit("logger:error", { message, data })
      }
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {any} data - Additional data
   */
  warn(message, data) {
    if (this.currentLevel >= this.levels.WARN) {
      const formatted = this.formatMessage("WARN", message, data)
      if (this.enableColors) {
        console.warn(`%c${formatted}`, `color: ${this.colors.WARN}`)
      } else {
        console.warn(formatted)
      }
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {any} data - Additional data
   */
  info(message, data) {
    if (this.currentLevel >= this.levels.INFO) {
      const formatted = this.formatMessage("INFO", message, data)
      if (this.enableColors) {
        console.info(`%c${formatted}`, `color: ${this.colors.INFO}`)
      } else {
        console.info(formatted)
      }
    }
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {any} data - Additional data
   */
  debug(message, data) {
    if (this.currentLevel >= this.levels.DEBUG) {
      const formatted = this.formatMessage("DEBUG", message, data)
      if (this.enableColors) {
        console.log(`%c${formatted}`, `color: ${this.colors.DEBUG}`)
      } else {
        console.log(formatted)
      }
    }
  }

  /**
   * Log performance timing
   * @param {string} label - Performance label
   * @param {Function} fn - Function to measure
   * @returns {any} Function result
   */
  async time(label, fn) {
    const start = performance.now()
    try {
      const result = await fn()
      const end = performance.now()
      this.debug(`Performance: ${label}`, { duration: `${(end - start).toFixed(2)}ms` })
      return result
    } catch (error) {
      const end = performance.now()
      this.error(`Performance: ${label} failed`, {
        duration: `${(end - start).toFixed(2)}ms`,
        error: error.message,
      })
      throw error
    }
  }
}

// Global logger instance
window.Logger = new Logger()
