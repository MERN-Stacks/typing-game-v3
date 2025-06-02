import Config from "../config.js"
import Logger from "../logger.js"
import EventBus from "../event-bus.js"
import StateManager from "../state-manager.js"

class NetworkManager {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = Config.get("network.reconnectAttempts")
    this.reconnectDelay = Config.get("network.reconnectDelay")
    this.heartbeatInterval = null
    this.messageQueue = []
    this.requestId = 0
    this.pendingRequests = new Map()

    // API endpoints (configurable for different environments)
    this.endpoints = {
      auth: "/api/auth",
      game: "/api/game",
      players: "/api/players",
      websocket: this.getWebSocketUrl(),
    }

    this.setupEventListeners()
    Logger.info("NetworkManager initialized")
  }

  /**
   * Get WebSocket URL based on environment
   * @returns {string} WebSocket URL
   */
  getWebSocketUrl() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.host
    return `${protocol}//${host}/ws`
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for state changes that need network sync
    EventBus.on("player:moved", this.sendPlayerUpdate.bind(this))
    EventBus.on("word:typed", this.sendWordTyped.bind(this))
    EventBus.on("item:used", this.sendItemUsed.bind(this))

    // Handle network events
    window.addEventListener("online", this.handleOnline.bind(this))
    window.addEventListener("offline", this.handleOffline.bind(this))
  }

  /**
   * Connect to WebSocket server
   * @param {Object} credentials - User credentials
   * @returns {Promise} Connection promise
   */
  async connect(credentials = null) {
    return new Promise((resolve, reject) => {
      try {
        Logger.info("Attempting to connect to WebSocket server")

        this.socket = new WebSocket(this.endpoints.websocket)

        this.socket.onopen = () => {
          Logger.info("WebSocket connected")
          this.isConnected = true
          this.reconnectAttempts = 0

          StateManager.setState("network.connected", true)

          // Send authentication if credentials provided
          if (credentials) {
            this.authenticate(credentials)
          }

          // Start heartbeat
          this.startHeartbeat()

          // Process queued messages
          this.processMessageQueue()

          EventBus.emit("network:connected")
          resolve()
        }

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.socket.onclose = (event) => {
          Logger.warn("WebSocket connection closed", { code: event.code, reason: event.reason })
          this.isConnected = false
          StateManager.setState("network.connected", false)

          this.stopHeartbeat()
          EventBus.emit("network:disconnected", event)

          // Attempt reconnection if not intentional
          if (event.code !== 1000) {
            this.attemptReconnect()
          }
        }

        this.socket.onerror = (error) => {
          Logger.error("WebSocket error", error)
          StateManager.setError("Network connection error")
          reject(error)
        }

        // Connection timeout
        setTimeout(() => {
          if (this.socket.readyState !== WebSocket.OPEN) {
            this.socket.close()
            reject(new Error("Connection timeout"))
          }
        }, Config.get("network.timeout"))
      } catch (error) {
        Logger.error("Failed to create WebSocket connection", error)
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, "Client disconnect")
      this.socket = null
    }
    this.stopHeartbeat()
    this.isConnected = false
    StateManager.setState("network.connected", false)
    Logger.info("WebSocket disconnected")
  }

  /**
   * Handle incoming WebSocket messages
   * @param {string} data - Message data
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data)
      Logger.debug("Received message", message)

      switch (message.type) {
        case "auth_response":
          this.handleAuthResponse(message)
          break
        case "player_joined":
          this.handlePlayerJoined(message)
          break
        case "player_left":
          this.handlePlayerLeft(message)
          break
        case "player_update":
          this.handlePlayerUpdate(message)
          break
        case "word_spawned":
          this.handleWordSpawned(message)
          break
        case "word_typed":
          this.handleWordTyped(message)
          break
        case "item_dropped":
          this.handleItemDropped(message)
          break
        case "game_state":
          this.handleGameState(message)
          break
        case "heartbeat":
          this.handleHeartbeat(message)
          break
        case "error":
          this.handleServerError(message)
          break
        case "response":
          this.handleResponse(message)
          break
        default:
          Logger.warn("Unknown message type", message.type)
      }
    } catch (error) {
      Logger.error("Failed to parse message", error)
    }
  }

  /**
   * Send message to server
   * @param {Object} message - Message to send
   * @returns {Promise} Send promise
   */
  send(message) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        // Queue message for later sending
        this.messageQueue.push({ message, resolve, reject })
        Logger.debug("Message queued (not connected)", message)
        return
      }

      try {
        const messageWithId = {
          ...message,
          id: ++this.requestId,
          timestamp: Date.now(),
        }

        this.socket.send(JSON.stringify(messageWithId))

        // Store pending request for response handling
        if (message.expectResponse) {
          this.pendingRequests.set(messageWithId.id, { resolve, reject })

          // Set timeout for response
          setTimeout(() => {
            if (this.pendingRequests.has(messageWithId.id)) {
              this.pendingRequests.delete(messageWithId.id)
              reject(new Error("Request timeout"))
            }
          }, Config.get("network.timeout"))
        } else {
          resolve()
        }

        Logger.debug("Message sent", messageWithId)
      } catch (error) {
        Logger.error("Failed to send message", error)
        reject(error)
      }
    })
  }

  /**
   * Authenticate with server
   * @param {Object} credentials - User credentials
   */
  async authenticate(credentials) {
    try {
      await this.send({
        type: "auth",
        data: credentials,
        expectResponse: true,
      })
    } catch (error) {
      Logger.error("Authentication failed", error)
      StateManager.setError("Authentication failed")
    }
  }

  /**
   * Send player update
   * @param {Object} playerData - Player data
   */
  sendPlayerUpdate(playerData) {
    this.send({
      type: "player_update",
      data: playerData,
    })
  }

  /**
   * Send word typed event
   * @param {Object} wordData - Word data
   */
  sendWordTyped(wordData) {
    this.send({
      type: "word_typed",
      data: wordData,
    })
  }

  /**
   * Send item used event
   * @param {Object} itemData - Item data
   */
  sendItemUsed(itemData) {
    this.send({
      type: "item_used",
      data: itemData,
    })
  }

  /**
   * Request game state from server
   */
  async requestGameState() {
    try {
      await this.send({
        type: "get_game_state",
        expectResponse: true,
      })
    } catch (error) {
      Logger.error("Failed to request game state", error)
    }
  }

  /**
   * Handle authentication response
   * @param {Object} message - Auth response message
   */
  handleAuthResponse(message) {
    if (message.success) {
      StateManager.setState("user.isAuthenticated", true)
      StateManager.setState("user.id", message.data.userId)
      StateManager.setState("user.name", message.data.username)
      EventBus.emit("auth:success", message.data)
      Logger.info("Authentication successful")
    } else {
      StateManager.setError(message.error || "Authentication failed")
      EventBus.emit("auth:failed", message.error)
    }
  }

  /**
   * Handle player joined event
   * @param {Object} message - Player joined message
   */
  handlePlayerJoined(message) {
    StateManager.addPlayer(message.data)
    StateManager.addNotification({
      type: "info",
      message: `${message.data.name} joined the game`,
      duration: 3000,
    })
  }

  /**
   * Handle player left event
   * @param {Object} message - Player left message
   */
  handlePlayerLeft(message) {
    const player = StateManager.getState("players").get(message.data.playerId)
    if (player) {
      StateManager.removePlayer(message.data.playerId)
      StateManager.addNotification({
        type: "info",
        message: `${player.name} left the game`,
        duration: 3000,
      })
    }
  }

  /**
   * Handle player update event
   * @param {Object} message - Player update message
   */
  handlePlayerUpdate(message) {
    StateManager.updatePlayer(message.data.playerId, message.data.updates)
  }

  /**
   * Handle word spawned event
   * @param {Object} message - Word spawned message
   */
  handleWordSpawned(message) {
    StateManager.addWord(message.data)
  }

  /**
   * Handle word typed event
   * @param {Object} message - Word typed message
   */
  handleWordTyped(message) {
    StateManager.removeWord(message.data.wordId)
    EventBus.emit("word:completed", message.data)
  }

  /**
   * Handle item dropped event
   * @param {Object} message - Item dropped message
   */
  handleItemDropped(message) {
    const items = [...StateManager.getState("world.items"), message.data]
    StateManager.setState("world.items", items)
  }

  /**
   * Handle game state update
   * @param {Object} message - Game state message
   */
  handleGameState(message) {
    const { players, words, items } = message.data

    // Update players
    const playersMap = new Map()
    players.forEach((player) => playersMap.set(player.id, player))
    StateManager.setState("players", playersMap)

    // Update world state
    StateManager.setState("world.words", words)
    StateManager.setState("world.items", items)

    Logger.info("Game state synchronized")
  }

  /**
   * Handle heartbeat message
   * @param {Object} message - Heartbeat message
   */
  handleHeartbeat(message) {
    const latency = Date.now() - message.timestamp
    StateManager.setState("network.latency", latency)
    StateManager.setState("network.lastHeartbeat", Date.now())
  }

  /**
   * Handle server error
   * @param {Object} message - Error message
   */
  handleServerError(message) {
    Logger.error("Server error", message.error)
    StateManager.setError(message.error)
  }

  /**
   * Handle response to previous request
   * @param {Object} message - Response message
   */
  handleResponse(message) {
    const pendingRequest = this.pendingRequests.get(message.requestId)
    if (pendingRequest) {
      this.pendingRequests.delete(message.requestId)

      if (message.success) {
        pendingRequest.resolve(message.data)
      } else {
        pendingRequest.reject(new Error(message.error))
      }
    }
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: "heartbeat",
          timestamp: Date.now(),
        })
      }
    }, Config.get("network.heartbeatInterval"))
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Attempt to reconnect to server
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      Logger.error("Max reconnection attempts reached")
      StateManager.setError("Unable to reconnect to server")
      return
    }

    this.reconnectAttempts++
    StateManager.setState("network.reconnecting", true)

    Logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)

    setTimeout(() => {
      this.connect()
        .then(() => {
          StateManager.setState("network.reconnecting", false)
          StateManager.addNotification({
            type: "success",
            message: "Reconnected to server",
            duration: 3000,
          })
        })
        .catch(() => {
          this.attemptReconnect()
        })
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { message, resolve, reject } = this.messageQueue.shift()
      this.send(message).then(resolve).catch(reject)
    }
  }

  /**
   * Handle online event
   */
  handleOnline() {
    Logger.info("Network connection restored")
    if (!this.isConnected) {
      this.attemptReconnect()
    }
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    Logger.warn("Network connection lost")
    StateManager.addNotification({
      type: "warning",
      message: "Network connection lost",
      duration: 5000,
    })
  }

  /**
   * Make HTTP request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise} Request promise
   */
  async httpRequest(url, options = {}) {
    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }

    const requestOptions = { ...defaultOptions, ...options }

    try {
      const response = await fetch(url, requestOptions)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      Logger.error("HTTP request failed", { url, error })
      throw error
    }
  }

  /**
   * Get network statistics
   * @returns {Object} Network statistics
   */
  getStats() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      latency: StateManager.getState("network.latency"),
      queuedMessages: this.messageQueue.length,
      pendingRequests: this.pendingRequests.size,
    }
  }
}

// Global network manager instance
window.NetworkManager = new NetworkManager()
