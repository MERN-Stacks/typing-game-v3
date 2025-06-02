class Config {
  constructor() {
    this.settings = {
      // Game Settings
      game: {
        maxPlayers: 10,
        mapSize: { width: 2000, height: 2000 },
        viewDistance: 300,
        tickRate: 60,
        wordGenerationRate: 5000, // ms
        maxWords: 50,
      },

      // Player Settings
      player: {
        maxHealth: 100,
        maxInventorySize: 9,
        moveSpeed: 5,
        attackRange: 400,
        healAmount: 25,
        attackDamage: 20,
      },

      // UI Settings
      ui: {
        animationDuration: 300,
        fadeInDuration: 500,
        healthBarUpdateDuration: 500,
        minimapSize: 150,
        gridSize: 100,
      },

      // Network Settings
      network: {
        reconnectAttempts: 5,
        reconnectDelay: 2000,
        heartbeatInterval: 30000,
        timeout: 10000,
      },

      // Audio Settings
      audio: {
        masterVolume: 0.7,
        sfxVolume: 0.8,
        musicVolume: 0.5,
        enabled: true,
      },

      // Graphics Settings
      graphics: {
        enableParticles: true,
        enableShadows: false,
        enableBloom: true,
        targetFPS: 60,
        pixelRatio: window.devicePixelRatio || 1,
      },

      // Debug Settings
      debug: {
        showFPS: false,
        showCollisionBoxes: false,
        showNetworkStats: false,
        logLevel: "INFO",
      },
    }

    // Environment detection
    this.environment = this.detectEnvironment()

    // Load environment-specific settings
    this.loadEnvironmentSettings()

    // Load user preferences from localStorage
    this.loadUserPreferences()
  }

  /**
   * Detect current environment
   * @returns {string} Environment name
   */
  detectEnvironment() {
    const hostname = window.location.hostname

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "development"
    } else if (hostname.includes("staging") || hostname.includes("test")) {
      return "staging"
    } else {
      return "production"
    }
  }

  /**
   * Load environment-specific settings
   */
  loadEnvironmentSettings() {
    const envSettings = {
      development: {
        debug: {
          showFPS: true,
          logLevel: "DEBUG",
        },
        network: {
          timeout: 5000,
        },
      },
      staging: {
        debug: {
          logLevel: "INFO",
        },
      },
      production: {
        debug: {
          logLevel: "WARN",
        },
        graphics: {
          enableParticles: false,
        },
      },
    }

    if (envSettings[this.environment]) {
      this.mergeSettings(envSettings[this.environment])
    }
  }

  /**
   * Load user preferences from localStorage
   */
  loadUserPreferences() {
    try {
      const saved = localStorage.getItem("typingBattle_preferences")
      if (saved) {
        const preferences = JSON.parse(saved)
        this.mergeSettings(preferences)
      }
    } catch (error) {
      Logger.warn("Failed to load user preferences", error)
    }
  }

  /**
   * Save user preferences to localStorage
   */
  saveUserPreferences() {
    try {
      const preferences = {
        audio: this.settings.audio,
        graphics: this.settings.graphics,
        debug: this.settings.debug,
      }
      localStorage.setItem("typingBattle_preferences", JSON.stringify(preferences))
    } catch (error) {
      Logger.warn("Failed to save user preferences", error)
    }
  }

  /**
   * Merge settings with existing configuration
   * @param {Object} newSettings - Settings to merge
   */
  mergeSettings(newSettings) {
    this.settings = this.deepMerge(this.settings, newSettings)
  }

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const result = { ...target }

    for (const key in source) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }

    return result
  }

  /**
   * Get a configuration value
   * @param {string} path - Dot-separated path to the setting
   * @returns {any} Configuration value
   */
  get(path) {
    return path.split(".").reduce((obj, key) => obj && obj[key], this.settings)
  }

  /**
   * Set a configuration value
   * @param {string} path - Dot-separated path to the setting
   * @param {any} value - Value to set
   */
  set(path, value) {
    const keys = path.split(".")
    const lastKey = keys.pop()
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {}
      return obj[key]
    }, this.settings)

    target[lastKey] = value

    // Emit configuration change event
    EventBus.emit("config:changed", { path, value })
  }

  /**
   * Get all settings
   * @returns {Object} All settings
   */
  getAll() {
    return { ...this.settings }
  }

  /**
   * Reset to default settings
   */
  reset() {
    this.settings = this.getDefaultSettings()
    this.loadEnvironmentSettings()
    EventBus.emit("config:reset")
  }

  /**
   * Get default settings
   * @returns {Object} Default settings
   */
  getDefaultSettings() {
    // Return a deep copy of default settings
    return JSON.parse(JSON.stringify(this.constructor.prototype.settings || this.settings))
  }
}

// Global config instance
window.Config = new Config()
