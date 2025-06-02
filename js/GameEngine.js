class GameEngine {
  constructor() {
    this.isRunning = false
    this.isPaused = false
    this.lastFrameTime = 0
    this.deltaTime = 0
    this.targetFPS = Config.get("graphics.targetFPS")
    this.frameInterval = 1000 / this.targetFPS
    this.animationFrameId = null

    // Game systems
    this.systems = new Map()
    this.systemOrder = []

    // Performance monitoring
    this.performance = {
      fps: 0,
      frameCount: 0,
      lastFPSUpdate: 0,
      updateTime: 0,
      renderTime: 0,
    }

    this.initializeSystems()
    this.setupEventListeners()

    Logger.info("GameEngine initialized")
  }

  /**
   * Initialize game systems
   */
  initializeSystems() {
    // Register systems in order of execution
    this.registerSystem("input", InputManager)
    this.registerSystem("network", NetworkManager)
    this.registerSystem("audio", AudioManager)
    this.registerSystem("state", new StateManager())
    this.registerSystem("gameLogic", new GameLogic())
    this.registerSystem("ui", new UIManager())
    this.registerSystem("render", new RenderEngine())
    this.registerSystem("screen", new ScreenManager())
  }

  /**
   * Register a game system
   * @param {string} name - System name
   * @param {Object} system - System instance
   */
  registerSystem(name, system) {
    this.systems.set(name, system)
    this.systemOrder.push(name)

    // Initialize system if it has an init method
    if (system && typeof system.init === "function") {
      system.init()
    }

    Logger.debug(`System registered: ${name}`)
  }

  /**
   * Get system by name
   * @param {string} name - System name
   * @returns {Object} System instance
   */
  getSystem(name) {
    return this.systems.get(name)
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Game state events
    EventBus.on("game:start", this.start.bind(this))
    EventBus.on("game:pause", this.pause.bind(this))
    EventBus.on("game:resume", this.resume.bind(this))
    EventBus.on("game:stop", this.stop.bind(this))

    // System events
    EventBus.on("system:error", this.handleSystemError.bind(this))

    // Performance monitoring
    EventBus.on("config:changed", (data) => {
      if (data.path === "graphics.targetFPS") {
        this.targetFPS = data.value
        this.frameInterval = 1000 / this.targetFPS
      }
    })

    // Window events
    window.addEventListener("beforeunload", this.cleanup.bind(this))
    document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this))
  }

  /**
   * Start the game engine
   */
  start() {
    if (this.isRunning) {
      Logger.warn("GameEngine is already running")
      return
    }

    Logger.info("Starting GameEngine")

    this.isRunning = true
    this.isPaused = false
    this.lastFrameTime = performance.now()

    // Start all systems
    this.systemOrder.forEach((systemName) => {
      const system = this.systems.get(systemName)
      if (system && typeof system.start === "function") {
        try {
          system.start()
        } catch (error) {
          Logger.error(`Failed to start system: ${systemName}`, error)
        }
      }
    })

    // Start main loop
    this.gameLoop()

    StateManager.setState("game.status", "playing")
    EventBus.emit("engine:started")
  }

  /**
   * Pause the game engine
   */
  pause() {
    if (!this.isRunning || this.isPaused) {
      return
    }

    Logger.info("Pausing GameEngine")

    this.isPaused = true

    // Pause all systems
    this.systemOrder.forEach((systemName) => {
      const system = this.systems.get(systemName)
      if (system && typeof system.pause === "function") {
        try {
          system.pause()
        } catch (error) {
          Logger.error(`Failed to pause system: ${systemName}`, error)
        }
      }
    })

    StateManager.setState("game.status", "paused")
    EventBus.emit("engine:paused")
  }

  /**
   * Resume the game engine
   */
  resume() {
    if (!this.isRunning || !this.isPaused) {
      return
    }

    Logger.info("Resuming GameEngine")

    this.isPaused = false
    this.lastFrameTime = performance.now()

    // Resume all systems
    this.systemOrder.forEach((systemName) => {
      const system = this.systems.get(systemName)
      if (system && typeof system.resume === "function") {
        try {
          system.resume()
        } catch (error) {
          Logger.error(`Failed to resume system: ${systemName}`, error)
        }
      }
    })

    StateManager.setState("game.status", "playing")
    EventBus.emit("engine:resumed")
  }

  /**
   * Stop the game engine
   */
  stop() {
    if (!this.isRunning) {
      return
    }

    Logger.info("Stopping GameEngine")

    this.isRunning = false
    this.isPaused = false

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    // Stop all systems
    this.systemOrder.forEach((systemName) => {
      const system = this.systems.get(systemName)
      if (system && typeof system.stop === "function") {
        try {
          system.stop()
        } catch (error) {
          Logger.error(`Failed to stop system: ${systemName}`, error)
        }
      }
    })

    StateManager.setState("game.status", "ended")
    EventBus.emit("engine:stopped")
  }

  /**
   * Main game loop
   */
  gameLoop() {
    if (!this.isRunning) {
      return
    }

    const currentTime = performance.now()
    this.deltaTime = currentTime - this.lastFrameTime

    // Skip frame if running too fast
    if (this.deltaTime < this.frameInterval) {
      this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this))
      return
    }

    this.lastFrameTime = currentTime

    // Update performance metrics
    this.updatePerformanceMetrics(currentTime)

    if (!this.isPaused) {
      // Update phase
      const updateStart = performance.now()
      this.update(this.deltaTime)
      this.performance.updateTime = performance.now() - updateStart

      // Render phase
      const renderStart = performance.now()
      this.render(this.deltaTime)
      this.performance.renderTime = performance.now() - renderStart
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this))
  }

  /**
   * Update all systems
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    // Update systems in order
    this.systemOrder.forEach((systemName) => {
      const system = this.systems.get(systemName)
      if (system && typeof system.update === "function") {
        try {
          system.update(deltaTime)
        } catch (error) {
          Logger.error(`Error updating system: ${systemName}`, error)
          EventBus.emit("system:error", { system: systemName, error })
        }
      }
    })
  }

  /**
   * Render all systems
   * @param {number} deltaTime - Time since last frame
   */
  render(deltaTime) {
    // Render systems in order
    this.systemOrder.forEach((systemName) => {
      const system = this.systems.get(systemName)
      if (system && typeof system.render === "function") {
        try {
          system.render(deltaTime)
        } catch (error) {
          Logger.error(`Error rendering system: ${systemName}`, error)
          EventBus.emit("system:error", { system: systemName, error })
        }
      }
    })
  }

  /**
   * Update performance metrics
   * @param {number} currentTime - Current timestamp
   */
  updatePerformanceMetrics(currentTime) {
    this.performance.frameCount++

    // Update FPS every second
    if (currentTime - this.performance.lastFPSUpdate >= 1000) {
      this.performance.fps = this.performance.frameCount
      this.performance.frameCount = 0
      this.performance.lastFPSUpdate = currentTime

      // Emit performance update
      EventBus.emit("engine:performance", this.performance)
    }
  }

  /**
   * Handle system error
   * @param {Object} errorData - Error data
   */
  handleSystemError(errorData) {
    Logger.error(`System error in ${errorData.system}`, errorData.error)

    // Attempt to recover or disable problematic system
    const system = this.systems.get(errorData.system)
    if (system && typeof system.recover === "function") {
      try {
        system.recover()
        Logger.info(`System ${errorData.system} recovered`)
      } catch (recoveryError) {
        Logger.error(`Failed to recover system ${errorData.system}`, recoveryError)
        // Disable system to prevent further errors
        this.disableSystem(errorData.system)
      }
    }
  }

  /**
   * Disable a system
   * @param {string} systemName - System name
   */
  disableSystem(systemName) {
    const systemIndex = this.systemOrder.indexOf(systemName)
    if (systemIndex !== -1) {
      this.systemOrder.splice(systemIndex, 1)
      Logger.warn(`System ${systemName} disabled`)
    }
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      if (this.isRunning && !this.isPaused) {
        this.pause()
        EventBus.emit("engine:backgrounded")
      }
    } else {
      if (this.isRunning && this.isPaused) {
        this.resume()
        EventBus.emit("engine:foregrounded")
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    Logger.info("Cleaning up GameEngine")

    this.stop()

    // Cleanup all systems
    this.systemOrder.forEach((systemName) => {
      const system = this.systems.get(systemName)
      if (system && typeof system.cleanup === "function") {
        try {
          system.cleanup()
        } catch (error) {
          Logger.error(`Failed to cleanup system: ${systemName}`, error)
        }
      }
    })

    // Clear systems
    this.systems.clear()
    this.systemOrder = []

    EventBus.emit("engine:cleanup")
  }

  /**
   * Get engine statistics
   * @returns {Object} Engine statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      fps: this.performance.fps,
      updateTime: this.performance.updateTime,
      renderTime: this.performance.renderTime,
      systemCount: this.systems.size,
      systems: this.systemOrder,
    }
  }
}

// Global game engine instance
window.GameEngine = new GameEngine()
