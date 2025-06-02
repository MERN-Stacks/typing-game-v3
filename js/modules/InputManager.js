class InputManager {
  constructor() {
    this.keys = new Map()
    this.mouse = {
      x: 0,
      y: 0,
      buttons: new Set(),
      wheel: 0,
    }
    this.touch = {
      touches: new Map(),
      gestures: {
        pinch: { active: false, scale: 1 },
        pan: { active: false, deltaX: 0, deltaY: 0 },
      },
    }

    this.keyBindings = new Map()
    this.inputBuffer = []
    this.maxBufferSize = 100

    this.setupDefaultKeyBindings()
    this.setupEventListeners()

    // Import Logger and EventBus (assuming they are globally available or imported elsewhere)
    // If not globally available, you'll need to import them here:
    // import Logger from './Logger'; // Example
    // import EventBus from './EventBus'; // Example

    Logger.info("InputManager initialized")
  }

  /**
   * Setup default key bindings
   */
  setupDefaultKeyBindings() {
    this.keyBindings.set("Enter", "submitWord")
    this.keyBindings.set("Escape", "openMenu")
    this.keyBindings.set("Tab", "toggleInventory")
    this.keyBindings.set("Space", "useSelectedItem")
    this.keyBindings.set("KeyW", "moveUp")
    this.keyBindings.set("KeyA", "moveLeft")
    this.keyBindings.set("KeyS", "moveDown")
    this.keyBindings.set("KeyD", "moveRight")
    this.keyBindings.set("Digit1", "selectItem1")
    this.keyBindings.set("Digit2", "selectItem2")
    this.keyBindings.set("Digit3", "selectItem3")
    this.keyBindings.set("Digit4", "selectItem4")
    this.keyBindings.set("Digit5", "selectItem5")
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Keyboard events
    document.addEventListener("keydown", this.handleKeyDown.bind(this))
    document.addEventListener("keyup", this.handleKeyUp.bind(this))

    // Mouse events
    document.addEventListener("mousedown", this.handleMouseDown.bind(this))
    document.addEventListener("mouseup", this.handleMouseUp.bind(this))
    document.addEventListener("mousemove", this.handleMouseMove.bind(this))
    document.addEventListener("wheel", this.handleWheel.bind(this))
    document.addEventListener("contextmenu", this.handleContextMenu.bind(this))

    // Touch events
    document.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: false })
    document.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false })
    document.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: false })
    document.addEventListener("touchcancel", this.handleTouchCancel.bind(this))

    // Focus events
    window.addEventListener("blur", this.handleWindowBlur.bind(this))
    window.addEventListener("focus", this.handleWindowFocus.bind(this))
  }

  /**
   * Handle key down event
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyDown(event) {
    const key = event.code

    // Prevent default for game keys
    if (this.keyBindings.has(key)) {
      event.preventDefault()
    }

    // Track key state
    if (!this.keys.has(key)) {
      this.keys.set(key, {
        pressed: true,
        timestamp: Date.now(),
        repeat: event.repeat,
      })

      // Add to input buffer
      this.addToBuffer({
        type: "keydown",
        key,
        timestamp: Date.now(),
        repeat: event.repeat,
      })

      // Emit key event
      const action = this.keyBindings.get(key)
      if (action) {
        EventBus.emit(`input:${action}`, { key, event })
      }

      EventBus.emit("input:keydown", { key, action, event })
    }
  }

  /**
   * Handle key up event
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyUp(event) {
    const key = event.code

    if (this.keys.has(key)) {
      const keyData = this.keys.get(key)
      const duration = Date.now() - keyData.timestamp

      this.keys.delete(key)

      // Add to input buffer
      this.addToBuffer({
        type: "keyup",
        key,
        timestamp: Date.now(),
        duration,
      })

      // Emit key event
      const action = this.keyBindings.get(key)
      EventBus.emit("input:keyup", { key, action, duration, event })
    }
  }

  /**
   * Handle mouse down event
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseDown(event) {
    this.mouse.buttons.add(event.button)
    this.updateMousePosition(event)

    this.addToBuffer({
      type: "mousedown",
      button: event.button,
      x: this.mouse.x,
      y: this.mouse.y,
      timestamp: Date.now(),
    })

    EventBus.emit("input:mousedown", {
      button: event.button,
      x: this.mouse.x,
      y: this.mouse.y,
      event,
    })
  }

  /**
   * Handle mouse up event
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseUp(event) {
    this.mouse.buttons.delete(event.button)
    this.updateMousePosition(event)

    this.addToBuffer({
      type: "mouseup",
      button: event.button,
      x: this.mouse.x,
      y: this.mouse.y,
      timestamp: Date.now(),
    })

    EventBus.emit("input:mouseup", {
      button: event.button,
      x: this.mouse.x,
      y: this.mouse.y,
      event,
    })
  }

  /**
   * Handle mouse move event
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseMove(event) {
    const prevX = this.mouse.x
    const prevY = this.mouse.y

    this.updateMousePosition(event)

    const deltaX = this.mouse.x - prevX
    const deltaY = this.mouse.y - prevY

    EventBus.emit("input:mousemove", {
      x: this.mouse.x,
      y: this.mouse.y,
      deltaX,
      deltaY,
      buttons: Array.from(this.mouse.buttons),
      event,
    })
  }

  /**
   * Handle wheel event
   * @param {WheelEvent} event - Wheel event
   */
  handleWheel(event) {
    event.preventDefault()

    this.mouse.wheel = event.deltaY

    this.addToBuffer({
      type: "wheel",
      deltaY: event.deltaY,
      x: this.mouse.x,
      y: this.mouse.y,
      timestamp: Date.now(),
    })

    EventBus.emit("input:wheel", {
      deltaY: event.deltaY,
      x: this.mouse.x,
      y: this.mouse.y,
      event,
    })
  }

  /**
   * Handle context menu event
   * @param {Event} event - Context menu event
   */
  handleContextMenu(event) {
    event.preventDefault()
  }

  /**
   * Handle touch start event
   * @param {TouchEvent} event - Touch event
   */
  handleTouchStart(event) {
    event.preventDefault()

    for (const touch of event.changedTouches) {
      this.touch.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        timestamp: Date.now(),
      })
    }

    this.updateGestures()

    EventBus.emit("input:touchstart", {
      touches: Array.from(this.touch.touches.values()),
      event,
    })
  }

  /**
   * Handle touch move event
   * @param {TouchEvent} event - Touch event
   */
  handleTouchMove(event) {
    event.preventDefault()

    for (const touch of event.changedTouches) {
      if (this.touch.touches.has(touch.identifier)) {
        const touchData = this.touch.touches.get(touch.identifier)
        touchData.x = touch.clientX
        touchData.y = touch.clientY
      }
    }

    this.updateGestures()

    EventBus.emit("input:touchmove", {
      touches: Array.from(this.touch.touches.values()),
      gestures: this.touch.gestures,
      event,
    })
  }

  /**
   * Handle touch end event
   * @param {TouchEvent} event - Touch event
   */
  handleTouchEnd(event) {
    for (const touch of event.changedTouches) {
      this.touch.touches.delete(touch.identifier)
    }

    this.updateGestures()

    EventBus.emit("input:touchend", {
      touches: Array.from(this.touch.touches.values()),
      event,
    })
  }

  /**
   * Handle touch cancel event
   * @param {TouchEvent} event - Touch event
   */
  handleTouchCancel(event) {
    for (const touch of event.changedTouches) {
      this.touch.touches.delete(touch.identifier)
    }

    this.updateGestures()

    EventBus.emit("input:touchcancel", { event })
  }

  /**
   * Handle window blur event
   */
  handleWindowBlur() {
    // Clear all input states when window loses focus
    this.keys.clear()
    this.mouse.buttons.clear()
    this.touch.touches.clear()

    EventBus.emit("input:blur")
  }

  /**
   * Handle window focus event
   */
  handleWindowFocus() {
    EventBus.emit("input:focus")
  }

  /**
   * Update mouse position
   * @param {MouseEvent} event - Mouse event
   */
  updateMousePosition(event) {
    this.mouse.x = event.clientX
    this.mouse.y = event.clientY
  }

  /**
   * Update touch gestures
   */
  updateGestures() {
    const touches = Array.from(this.touch.touches.values())

    if (touches.length === 2) {
      // Pinch gesture
      const touch1 = touches[0]
      const touch2 = touches[1]

      const currentDistance = Math.sqrt(Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2))

      const startDistance = Math.sqrt(
        Math.pow(touch2.startX - touch1.startX, 2) + Math.pow(touch2.startY - touch1.startY, 2),
      )

      this.touch.gestures.pinch.active = true
      this.touch.gestures.pinch.scale = currentDistance / startDistance
    } else {
      this.touch.gestures.pinch.active = false
      this.touch.gestures.pinch.scale = 1
    }

    if (touches.length === 1) {
      // Pan gesture
      const touch = touches[0]
      this.touch.gestures.pan.active = true
      this.touch.gestures.pan.deltaX = touch.x - touch.startX
      this.touch.gestures.pan.deltaY = touch.y - touch.startY
    } else {
      this.touch.gestures.pan.active = false
      this.touch.gestures.pan.deltaX = 0
      this.touch.gestures.pan.deltaY = 0
    }
  }

  /**
   * Add input event to buffer
   * @param {Object} inputEvent - Input event data
   */
  addToBuffer(inputEvent) {
    this.inputBuffer.push(inputEvent)

    // Limit buffer size
    if (this.inputBuffer.length > this.maxBufferSize) {
      this.inputBuffer.shift()
    }
  }

  /**
   * Check if key is currently pressed
   * @param {string} key - Key code
   * @returns {boolean} True if key is pressed
   */
  isKeyPressed(key) {
    return this.keys.has(key)
  }

  /**
   * Check if mouse button is currently pressed
   * @param {number} button - Mouse button (0=left, 1=middle, 2=right)
   * @returns {boolean} True if button is pressed
   */
  isMouseButtonPressed(button) {
    return this.mouse.buttons.has(button)
  }

  /**
   * Get current mouse position
   * @returns {Object} Mouse position {x, y}
   */
  getMousePosition() {
    return { x: this.mouse.x, y: this.mouse.y }
  }

  /**
   * Get current touch positions
   * @returns {Array} Array of touch positions
   */
  getTouchPositions() {
    return Array.from(this.touch.touches.values())
  }

  /**
   * Set key binding
   * @param {string} key - Key code
   * @param {string} action - Action name
   */
  setKeyBinding(key, action) {
    this.keyBindings.set(key, action)
    EventBus.emit("input:bindingChanged", { key, action })
  }

  /**
   * Remove key binding
   * @param {string} key - Key code
   */
  removeKeyBinding(key) {
    this.keyBindings.delete(key)
    EventBus.emit("input:bindingRemoved", { key })
  }

  /**
   * Get key binding for action
   * @param {string} action - Action name
   * @returns {string|null} Key code or null if not found
   */
  getKeyForAction(action) {
    for (const [key, boundAction] of this.keyBindings) {
      if (boundAction === action) {
        return key
      }
    }
    return null
  }

  /**
   * Clear input buffer
   */
  clearBuffer() {
    this.inputBuffer = []
  }

  /**
   * Get input statistics
   * @returns {Object} Input statistics
   */
  getStats() {
    return {
      pressedKeys: this.keys.size,
      pressedMouseButtons: this.mouse.buttons.size,
      activeTouches: this.touch.touches.size,
      bufferSize: this.inputBuffer.length,
      keyBindings: this.keyBindings.size,
      gestures: {
        pinchActive: this.touch.gestures.pinch.active,
        panActive: this.touch.gestures.pan.active,
      },
    }
  }
}

// Global input manager instance
window.InputManager = new InputManager()
