class AudioManager {
  constructor() {
    this.audioContext = null
    this.sounds = new Map()
    this.music = new Map()
    this.currentMusic = null
    this.masterVolume = Config.get("audio.masterVolume")
    this.sfxVolume = Config.get("audio.sfxVolume")
    this.musicVolume = Config.get("audio.musicVolume")
    this.enabled = Config.get("audio.enabled")
    this.loadedSounds = new Set()

    this.initializeAudioContext()
    this.setupEventListeners()
    this.loadAudioAssets()

    Logger.info("AudioManager initialized")
  }

  /**
   * Initialize Web Audio API context
   */
  initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()

      // Handle audio context state changes
      this.audioContext.addEventListener("statechange", () => {
        Logger.debug("Audio context state changed", this.audioContext.state)
      })
    } catch (error) {
      Logger.error("Failed to initialize audio context", error)
      this.enabled = false
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Game events that trigger sounds
    EventBus.on("word:typed", () => this.playSound("wordTyped"))
    EventBus.on("word:completed", () => this.playSound("wordCompleted"))
    EventBus.on("player:damaged", () => this.playSound("playerDamaged"))
    EventBus.on("player:healed", () => this.playSound("playerHealed"))
    EventBus.on("item:collected", () => this.playSound("itemCollected"))
    EventBus.on("item:used", () => this.playSound("itemUsed"))
    EventBus.on("game:started", () => this.playMusic("gameBackground"))
    EventBus.on("game:ended", () => this.stopMusic())
    EventBus.on("ui:buttonClick", () => this.playSound("buttonClick"))
    EventBus.on("ui:error", () => this.playSound("error"))

    // Configuration changes
    EventBus.on("config:changed", (data) => {
      if (data.path.startsWith("audio.")) {
        this.updateAudioSettings()
      }
    })

    // Handle user interaction for audio context
    document.addEventListener("click", this.resumeAudioContext.bind(this), { once: true })
    document.addEventListener("keydown", this.resumeAudioContext.bind(this), { once: true })
  }

  /**
   * Resume audio context (required for user interaction)
   */
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume()
        Logger.info("Audio context resumed")
      } catch (error) {
        Logger.error("Failed to resume audio context", error)
      }
    }
  }

  /**
   * Load audio assets
   */
  async loadAudioAssets() {
    const soundAssets = {
      wordTyped: this.generateToneBuffer(800, 0.1),
      wordCompleted: this.generateToneBuffer(1200, 0.2),
      playerDamaged: this.generateNoiseBuffer(0.3),
      playerHealed: this.generateToneBuffer(600, 0.4),
      itemCollected: this.generateToneBuffer(1000, 0.15),
      itemUsed: this.generateToneBuffer(1400, 0.2),
      buttonClick: this.generateToneBuffer(500, 0.1),
      error: this.generateToneBuffer(300, 0.5),
    }

    // Load generated sounds
    for (const [name, buffer] of Object.entries(soundAssets)) {
      if (buffer) {
        this.sounds.set(name, buffer)
        this.loadedSounds.add(name)
      }
    }

    // Load music (would typically be loaded from files)
    this.music.set("gameBackground", this.generateAmbientMusic())
    this.music.set("menuBackground", this.generateMenuMusic())

    Logger.info(`Loaded ${this.loadedSounds.size} audio assets`)
  }

  /**
   * Generate tone buffer for sound effects
   * @param {number} frequency - Tone frequency
   * @param {number} duration - Duration in seconds
   * @returns {AudioBuffer} Generated audio buffer
   */
  generateToneBuffer(frequency, duration) {
    if (!this.audioContext) return null

    const sampleRate = this.audioContext.sampleRate
    const frameCount = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate)
    const channelData = buffer.getChannelData(0)

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 3) // Exponential decay
      channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3
    }

    return buffer
  }

  /**
   * Generate noise buffer for sound effects
   * @param {number} duration - Duration in seconds
   * @returns {AudioBuffer} Generated noise buffer
   */
  generateNoiseBuffer(duration) {
    if (!this.audioContext) return null

    const sampleRate = this.audioContext.sampleRate
    const frameCount = sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate)
    const channelData = buffer.getChannelData(0)

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 5)
      channelData[i] = (Math.random() * 2 - 1) * envelope * 0.2
    }

    return buffer
  }

  /**
   * Generate ambient music
   * @returns {AudioBuffer} Generated music buffer
   */
  generateAmbientMusic() {
    if (!this.audioContext) return null

    const duration = 30 // 30 seconds loop
    const sampleRate = this.audioContext.sampleRate
    const frameCount = sampleRate * duration
    const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate)

    const frequencies = [220, 330, 440, 550] // Base frequencies

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel)

      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate
        let sample = 0

        frequencies.forEach((freq, index) => {
          const modulation = 1 + 0.1 * Math.sin(2 * Math.PI * 0.1 * t)
          const wave = Math.sin(2 * Math.PI * freq * modulation * t)
          const envelope = 0.5 + 0.3 * Math.sin(2 * Math.PI * 0.05 * t)
          sample += wave * envelope * (0.1 / frequencies.length)
        })

        channelData[i] = sample
      }
    }

    return buffer
  }

  /**
   * Generate menu music
   * @returns {AudioBuffer} Generated menu music buffer
   */
  generateMenuMusic() {
    if (!this.audioContext) return null

    const duration = 20 // 20 seconds loop
    const sampleRate = this.audioContext.sampleRate
    const frameCount = sampleRate * duration
    const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate)

    const melody = [440, 494, 523, 587, 659, 698, 784, 880] // A major scale

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel)

      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate
        const noteIndex = Math.floor(t * 2) % melody.length
        const frequency = melody[noteIndex]

        const wave = Math.sin(2 * Math.PI * frequency * t)
        const envelope = 0.3 * (1 + Math.sin(2 * Math.PI * 0.1 * t)) * 0.5

        channelData[i] = wave * envelope * 0.15
      }
    }

    return buffer
  }

  /**
   * Play sound effect
   * @param {string} soundName - Name of the sound to play
   * @param {Object} options - Playback options
   */
  playSound(soundName, options = {}) {
    if (!this.enabled || !this.audioContext || !this.sounds.has(soundName)) {
      return
    }

    const { volume = 1, pitch = 1, delay = 0, loop = false } = options

    try {
      const buffer = this.sounds.get(soundName)
      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()

      source.buffer = buffer
      source.playbackRate.value = pitch
      source.loop = loop

      gainNode.gain.value = volume * this.sfxVolume * this.masterVolume

      source.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      source.start(this.audioContext.currentTime + delay)

      Logger.debug(`Playing sound: ${soundName}`)
    } catch (error) {
      Logger.error(`Failed to play sound: ${soundName}`, error)
    }
  }

  /**
   * Play background music
   * @param {string} musicName - Name of the music to play
   * @param {Object} options - Playback options
   */
  playMusic(musicName, options = {}) {
    if (!this.enabled || !this.audioContext || !this.music.has(musicName)) {
      return
    }

    // Stop current music
    this.stopMusic()

    const { volume = 1, fadeIn = true, fadeInDuration = 2 } = options

    try {
      const buffer = this.music.get(musicName)
      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()

      source.buffer = buffer
      source.loop = true

      const finalVolume = volume * this.musicVolume * this.masterVolume

      if (fadeIn) {
        gainNode.gain.value = 0
        gainNode.gain.linearRampToValueAtTime(finalVolume, this.audioContext.currentTime + fadeInDuration)
      } else {
        gainNode.gain.value = finalVolume
      }

      source.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      source.start()

      this.currentMusic = {
        source,
        gainNode,
        name: musicName,
      }

      Logger.info(`Playing music: ${musicName}`)
    } catch (error) {
      Logger.error(`Failed to play music: ${musicName}`, error)
    }
  }

  /**
   * Stop background music
   * @param {Object} options - Stop options
   */
  stopMusic(options = {}) {
    if (!this.currentMusic) return

    const { fadeOut = true, fadeOutDuration = 1 } = options

    try {
      if (fadeOut) {
        this.currentMusic.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeOutDuration)

        setTimeout(() => {
          if (this.currentMusic) {
            this.currentMusic.source.stop()
            this.currentMusic = null
          }
        }, fadeOutDuration * 1000)
      } else {
        this.currentMusic.source.stop()
        this.currentMusic = null
      }

      Logger.info("Music stopped")
    } catch (error) {
      Logger.error("Failed to stop music", error)
    }
  }

  /**
   * Set master volume
   * @param {number} volume - Volume level (0-1)
   */
  setMasterVolume(volume) {
    this.masterVolume = Utils.clamp(volume, 0, 1)
    Config.set("audio.masterVolume", this.masterVolume)
    this.updateCurrentMusicVolume()
  }

  /**
   * Set SFX volume
   * @param {number} volume - Volume level (0-1)
   */
  setSfxVolume(volume) {
    this.sfxVolume = Utils.clamp(volume, 0, 1)
    Config.set("audio.sfxVolume", this.sfxVolume)
  }

  /**
   * Set music volume
   * @param {number} volume - Volume level (0-1)
   */
  setMusicVolume(volume) {
    this.musicVolume = Utils.clamp(volume, 0, 1)
    Config.set("audio.musicVolume", this.musicVolume)
    this.updateCurrentMusicVolume()
  }

  /**
   * Update current music volume
   */
  updateCurrentMusicVolume() {
    if (this.currentMusic) {
      const newVolume = this.musicVolume * this.masterVolume
      this.currentMusic.gainNode.gain.value = newVolume
    }
  }

  /**
   * Enable/disable audio
   * @param {boolean} enabled - Audio enabled state
   */
  setEnabled(enabled) {
    this.enabled = enabled
    Config.set("audio.enabled", this.enabled)

    if (!enabled) {
      this.stopMusic({ fadeOut: false })
    }
  }

  /**
   * Update audio settings from config
   */
  updateAudioSettings() {
    this.masterVolume = Config.get("audio.masterVolume")
    this.sfxVolume = Config.get("audio.sfxVolume")
    this.musicVolume = Config.get("audio.musicVolume")
    this.enabled = Config.get("audio.enabled")

    this.updateCurrentMusicVolume()
  }

  /**
   * Get audio statistics
   * @returns {Object} Audio statistics
   */
  getStats() {
    return {
      enabled: this.enabled,
      contextState: this.audioContext?.state,
      loadedSounds: this.loadedSounds.size,
      currentMusic: this.currentMusic?.name || null,
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
      musicVolume: this.musicVolume,
    }
  }
}

// Global audio manager instance
window.AudioManager = new AudioManager()
