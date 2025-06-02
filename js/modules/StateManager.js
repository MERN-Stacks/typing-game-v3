import Logger from "./Logger.js"
import Config from "./Config.js"
import Utils from "./Utils.js"
import EventBus from "./EventBus.js"

class StateManager {
  constructor() {
    this.state = this.getInitialState()
    this.history = []
    this.maxHistorySize = 50
    this.subscribers = new Map()
    this.middleware = []

    Logger.info("StateManager initialized")
  }

  /**
   * Get initial state
   * @returns {Object} Initial state
   */
  getInitialState() {
    return {
      // Game state
      game: {
        status: "menu", // menu, playing, paused, ended
        mode: "multiplayer", // singleplayer, multiplayer, spectator
        startTime: null,
        endTime: null,
        score: 0,
      },

      // Current user
      user: {
        id: null,
        name: null,
        skin: "😊",
        isAuthenticated: false,
        preferences: {},
      },

      // Players
      players: new Map(),

      // Game world
      world: {
        words: [],
        items: [],
        effects: [],
        camera: { x: 0, y: 0 },
        mapSize: Config.get("game.mapSize"),
      },

      // UI state
      ui: {
        currentScreen: "login",
        isLoading: false,
        error: null,
        notifications: [],
        modals: {
          settings: false,
          inventory: false,
          playerList: false,
        },
      },

      // Network state
      network: {
        connected: false,
        latency: 0,
        reconnecting: false,
        lastHeartbeat: null,
      },
    }
  }

  /**
   * Subscribe to state changes
   * @param {string} path - State path to watch
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set())
    }

    this.subscribers.get(path).add(callback)

    // Return unsubscribe function
    return () => {
      const pathSubscribers = this.subscribers.get(path)
      if (pathSubscribers) {
        pathSubscribers.delete(callback)
        if (pathSubscribers.size === 0) {
          this.subscribers.delete(path)
        }
      }
    }
  }

  /**
   * Add middleware for state updates
   * @param {Function} middleware - Middleware function
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware)
  }

  /**
   * Get state value by path
   * @param {string} path - Dot-separated path
   * @returns {any} State value
   */
  getState(path = null) {
    if (!path) return Utils.deepClone(this.state)

    return path.split(".").reduce((obj, key) => {
      if (obj && obj.has && obj.has(key)) {
        return obj.get(key)
      }
      return obj && obj[key]
    }, this.state)
  }

  /**
   * Update state
   * @param {string} path - Dot-separated path
   * @param {any} value - New value
   * @param {Object} options - Update options
   */
  setState(path, value, options = {}) {
    const { silent = false, addToHistory = true } = options

    // Save current state to history
    if (addToHistory) {
      this.addToHistory()
    }

    // Apply middleware
    let processedValue = value
    for (const middleware of this.middleware) {
      processedValue = middleware(path, processedValue, this.state)
    }

    // Update state
    const keys = path.split(".")
    const lastKey = keys.pop()
    let target = this.state

    // Navigate to the target object
    for (const key of keys) {
      if (!target[key]) {
        target[key] = {}
      }
      target = target[key]
    }

    // Handle Map objects
    if (target instanceof Map) {
      target.set(lastKey, processedValue)
    } else {
      target[lastKey] = processedValue
    }

    // Notify subscribers
    if (!silent) {
      this.notifySubscribers(path, processedValue)
    }

    // Emit global state change event
    EventBus.emit("state:changed", { path, value: processedValue })

    Logger.debug(`State updated: ${path}`, processedValue)
  }

  /**
   * Update multiple state paths atomically
   * @param {Object} updates - Object with path-value pairs
   * @param {Object} options - Update options
   */
  batchUpdate(updates, options = {}) {
    const { silent = false, addToHistory = true } = options

    if (addToHistory) {
      this.addToHistory()
    }

    const changedPaths = []

    for (const [path, value] of Object.entries(updates)) {
      this.setState(path, value, { silent: true, addToHistory: false })
      changedPaths.push(path)
    }

    // Notify all subscribers after batch update
    if (!silent) {
      changedPaths.forEach((path) => {
        this.notifySubscribers(path, this.getState(path))
      })
    }

    EventBus.emit("state:batchChanged", changedPaths)
  }

  /**
   * Add player to state
   * @param {Object} player - Player object
   */
  addPlayer(player) {
    const players = this.getState("players")
    players.set(player.id, player)
    this.setState("players", players)

    EventBus.emit("player:added", player)
  }

  /**
   * Remove player from state
   * @param {string} playerId - Player ID
   */
  removePlayer(playerId) {
    const players = this.getState("players")
    const player = players.get(playerId)

    if (player) {
      players.delete(playerId)
      this.setState("players", players)
      EventBus.emit("player:removed", player)
    }
  }

  /**
   * Update player data
   * @param {string} playerId - Player ID
   * @param {Object} updates - Player updates
   */
  updatePlayer(playerId, updates) {
    const players = this.getState("players")
    const player = players.get(playerId)

    if (player) {
      const updatedPlayer = { ...player, ...updates }
      players.set(playerId, updatedPlayer)
      this.setState("players", players)
      EventBus.emit("player:updated", { playerId, updates })
    }
  }

  /**
   * Add word to world
   * @param {Object} word - Word object
   */
  addWord(word) {
    const words = [...this.getState("world.words"), word]
    this.setState("world.words", words)
  }

  /**
   * Remove word from world
   * @param {number} wordId - Word ID
   */
  removeWord(wordId) {
    const words = this.getState("world.words").filter((word) => word.id !== wordId)
    this.setState("world.words", words)
  }

  /**
   * Add notification
   * @param {Object} notification - Notification object
   */
  addNotification(notification) {
    const notifications = [
      ...this.getState("ui.notifications"),
      {
        id: Utils.generateId(),
        timestamp: Date.now(),
        ...notification,
      },
    ]
    this.setState("ui.notifications", notifications)
  }

  /**
   * Remove notification
   * @param {string} notificationId - Notification ID
   */
  removeNotification(notificationId) {
    const notifications = this.getState("ui.notifications").filter((n) => n.id !== notificationId)
    this.setState("ui.notifications", notifications)
  }

  /**
   * Set error state
   * @param {string|Error} error - Error message or object
   */
  setError(error) {
    const errorMessage = error instanceof Error ? error.message : error
    this.setState("ui.error", errorMessage)

    if (errorMessage) {
      this.addNotification({
        type: "error",
        message: errorMessage,
        duration: 5000,
      })
    }
  }

  /**
   * Clear error state
   */
  clearError() {
    this.setState("ui.error", null)
  }

  /**
   * Set loading state
   * @param {boolean} isLoading - Loading state
   */
  setLoading(isLoading) {
    this.setState("ui.isLoading", isLoading)
  }

  /**
   * Notify subscribers of state changes
   * @param {string} path - Changed path
   * @param {any} value - New value
   */
  notifySubscribers(path, value) {
    // Notify exact path subscribers
    const exactSubscribers = this.subscribers.get(path)
    if (exactSubscribers) {
      exactSubscribers.forEach((callback) => {
        try {
          callback(value, path)
        } catch (error) {
          Logger.error(`Error in state subscriber for path '${path}':`, error)
        }
      })
    }

    // Notify parent path subscribers
    const pathParts = path.split(".")
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join(".")
      const parentSubscribers = this.subscribers.get(parentPath)

      if (parentSubscribers) {
        const parentValue = this.getState(parentPath)
        parentSubscribers.forEach((callback) => {
          try {
            callback(parentValue, parentPath)
          } catch (error) {
            Logger.error(`Error in state subscriber for parent path '${parentPath}':`, error)
          }
        })
      }
    }
  }

  /**
   * Add current state to history
   */
  addToHistory() {
    this.history.push(Utils.deepClone(this.state))

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }
  }

  /**
   * Undo last state change
   * @returns {boolean} True if undo was successful
   */
  undo() {
    if (this.history.length > 0) {
      this.state = this.history.pop()
      EventBus.emit("state:undo")
      Logger.debug("State undo performed")
      return true
    }
    return false
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.state = this.getInitialState()
    this.history = []
    EventBus.emit("state:reset")
    Logger.info("State reset to initial values")
  }

  /**
   * Get state statistics
   * @returns {Object} State statistics
   */
  getStats() {
    return {
      historySize: this.history.length,
      subscriberCount: Array.from(this.subscribers.values()).reduce((total, set) => total + set.size, 0),
      playerCount: this.getState("players").size,
      wordCount: this.getState("world.words").length,
    }
  }
}

// Global state manager instance
window.StateManager = new StateManager()
