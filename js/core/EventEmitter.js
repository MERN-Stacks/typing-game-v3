class EventEmitter {
  constructor() {
    this.events = new Map()
    this.maxListeners = 50
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @param {Object} context - Context for callback execution
   */
  on(event, callback, context = null) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }

    const listeners = this.events.get(event)

    if (listeners.length >= this.maxListeners) {
      console.warn(`EventEmitter: Maximum listeners (${this.maxListeners}) exceeded for event: ${event}`)
    }

    listeners.push({ callback, context })
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @param {Object} context - Context for callback execution
   */
  once(event, callback, context = null) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper)
      callback.apply(context, args)
    }
    this.on(event, onceWrapper, context)
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (!this.events.has(event)) return

    const listeners = this.events.get(event)
    const index = listeners.findIndex((listener) => listener.callback === callback)

    if (index !== -1) {
      listeners.splice(index, 1)
    }

    if (listeners.length === 0) {
      this.events.delete(event)
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to listeners
   */
  emit(event, ...args) {
    if (!this.events.has(event)) return

    const listeners = this.events.get(event)

    // Create a copy to avoid issues if listeners are modified during emission
    ;[...listeners].forEach(({ callback, context }) => {
      try {
        callback.apply(context, args)
      } catch (error) {
        console.error(`EventEmitter: Error in listener for event '${event}':`, error)
      }
    })
  }

  /**
   * Remove all listeners for an event or all events
   * @param {string} event - Optional event name
   */
  removeAllListeners(event = null) {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0
  }
}

// Global event bus instance
window.EventBus = new EventEmitter()
