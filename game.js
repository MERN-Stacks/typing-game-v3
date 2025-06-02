class TypingBattleGame {
  constructor() {
    this.currentScreen = "login"
    this.currentUser = null
    this.gameState = {
      players: new Map(),
      words: [],
      items: [],
      camera: { x: 0, y: 0 },
      mapSize: { width: 2000, height: 2000 },
    }
    this.canvas = null
    this.ctx = null
    this.isSpectator = false
    this.isDragging = false
    this.lastMousePos = { x: 0, y: 0 }
    this.selectedSkin = "😊"

    // Available skins
    this.skins = ["😊", "🤖", "🐱", "🐶", "🦊", "🐸", "🐼", "🦄", "👻", "🎃", "⭐", "🌟"]

    // Word lists for different effects
    this.wordLists = {
      attack: ["공격", "타격", "폭발", "번개", "화염"],
      heal: ["회복", "치료", "힐링", "재생", "생명"],
      speed: ["속도", "빠름", "질주", "가속", "순간"],
      shield: ["방어", "보호", "실드", "가드", "차단"],
      item: ["아이템", "보물", "선물", "상자", "보상"],
    }

    // Item types
    this.itemTypes = {
      heal: { emoji: "❤️", name: "회복 포션" },
      attack: { emoji: "⚔️", name: "공격 아이템" },
      speed: { emoji: "⚡", name: "속도 부스터" },
      shield: { emoji: "🛡️", name: "방어막" },
    }

    this.init()
  }

  init() {
    this.setupEventListeners()
    this.setupSkinSelection()
    this.showScreen("login")

    // Simulate some initial players for demo
    this.addDemoPlayers()
  }

  setupEventListeners() {
    // Login screen
    document.getElementById("startGameBtn").addEventListener("click", () => this.startGame())
    document.getElementById("skinListBtn").addEventListener("click", () => this.showSkinSelection())
    document.getElementById("spectatorBtn").addEventListener("click", () => this.startSpectator())
    document.getElementById("settingsBtn").addEventListener("click", () => this.showSettings())

    // Skin selection
    document.getElementById("backToLoginBtn").addEventListener("click", () => this.showScreen("login"))

    // Game controls
    document.getElementById("typingField").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.submitWord()
      }
    })
    document.getElementById("submitWord").addEventListener("click", () => this.submitWord())

    // Spectator
    document.getElementById("exitSpectatorBtn").addEventListener("click", () => this.showScreen("login"))

    // User ID input for profile preview
    document.getElementById("userId").addEventListener("input", (e) => {
      this.updateProfilePreview(e.target.value)
    })
  }

  setupSkinSelection() {
    const skinGrid = document.getElementById("skinGrid")
    skinGrid.innerHTML = ""

    this.skins.forEach((skin) => {
      const skinOption = document.createElement("div")
      skinOption.className = "skin-option"
      skinOption.textContent = skin
      skinOption.addEventListener("click", () => this.selectSkin(skin))
      skinGrid.appendChild(skinOption)
    })
  }

  selectSkin(skin) {
    this.selectedSkin = skin
    document.querySelectorAll(".skin-option").forEach((option) => {
      option.classList.remove("selected")
    })
    event.target.classList.add("selected")
    this.updateProfilePreview()
  }

  updateProfilePreview(userId = "") {
    const avatar = document.getElementById("profileAvatar")
    avatar.textContent = this.selectedSkin

    if (userId) {
      avatar.title = userId
    }
  }

  showScreen(screenName) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active")
    })
    document.getElementById(screenName + "Screen").classList.add("active")
    this.currentScreen = screenName

    if (screenName === "game") {
      this.initGameCanvas()
    } else if (screenName === "spectator") {
      this.initSpectatorCanvas()
    }
  }

  showSkinSelection() {
    this.showScreen("skin")
  }

  showSettings() {
    alert("Settings functionality would be implemented here")
  }

  startGame() {
    const userId = document.getElementById("userId").value.trim()
    const password = document.getElementById("password").value.trim()

    if (!userId || !password) {
      alert("Please enter both user ID and password")
      return
    }

    // Simple user recognition (in real app, this would be server-side)
    this.currentUser = {
      id: userId,
      name: userId,
      skin: this.selectedSkin,
      health: 100,
      position: { x: 1000, y: 1000 },
      inventory: [],
    }

    this.gameState.players.set(userId, this.currentUser)
    this.isSpectator = false
    this.showScreen("game")
    this.startGameLoop()
  }

  startSpectator() {
    this.isSpectator = true
    this.showScreen("spectator")
    this.startGameLoop()
  }

  initGameCanvas() {
    this.canvas = document.getElementById("gameCanvas")
    this.ctx = this.canvas.getContext("2d")
    this.resizeCanvas()

    window.addEventListener("resize", () => this.resizeCanvas())
    this.setupCanvasEvents()
    this.updatePlayerInfo()
    this.updatePlayerList()
    this.generateWords()
  }

  initSpectatorCanvas() {
    this.canvas = document.getElementById("spectatorCanvas")
    this.ctx = this.canvas.getContext("2d")
    this.resizeCanvas()

    window.addEventListener("resize", () => this.resizeCanvas())
    this.setupCanvasEvents()
    this.generateWords()
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  setupCanvasEvents() {
    let isMouseDown = false
    let lastMousePos = { x: 0, y: 0 }

    this.canvas.addEventListener("mousedown", (e) => {
      isMouseDown = true
      lastMousePos = { x: e.clientX, y: e.clientY }
      this.isDragging = false
    })

    this.canvas.addEventListener("mousemove", (e) => {
      if (isMouseDown) {
        const deltaX = e.clientX - lastMousePos.x
        const deltaY = e.clientY - lastMousePos.y

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          this.isDragging = true

          if (!this.isSpectator && this.currentUser) {
            // Move player
            this.currentUser.position.x -= deltaX
            this.currentUser.position.y -= deltaY

            // Clamp to map bounds
            this.currentUser.position.x = Math.max(
              50,
              Math.min(this.gameState.mapSize.width - 50, this.currentUser.position.x),
            )
            this.currentUser.position.y = Math.max(
              50,
              Math.min(this.gameState.mapSize.height - 50, this.currentUser.position.y),
            )
          } else {
            // Move camera for spectator
            this.gameState.camera.x -= deltaX
            this.gameState.camera.y -= deltaY
          }
        }

        lastMousePos = { x: e.clientX, y: e.clientY }
      }
    })

    this.canvas.addEventListener("mouseup", () => {
      isMouseDown = false
      setTimeout(() => {
        this.isDragging = false
      }, 100)
    })

    // Setup inventory drag and drop
    this.setupInventoryDragDrop()
  }

  setupInventoryDragDrop() {
    const inventoryGrid = document.getElementById("inventoryGrid")
    let draggedItem = null

    inventoryGrid.addEventListener("dragstart", (e) => {
      if (e.target.classList.contains("inventory-slot")) {
        draggedItem = e.target
        e.target.classList.add("dragging")
      }
    })

    inventoryGrid.addEventListener("dragend", (e) => {
      e.target.classList.remove("dragging")
      draggedItem = null
    })

    // Allow dropping on player avatars
    document.addEventListener("dragover", (e) => {
      e.preventDefault()
    })

    document.addEventListener("drop", (e) => {
      e.preventDefault()
      if (draggedItem && e.target.classList.contains("player-item-avatar")) {
        this.useItemOnPlayer(draggedItem.dataset.itemType, e.target.dataset.playerId)
      }
    })

    // Double-click for self-use or auto-target
    inventoryGrid.addEventListener("dblclick", (e) => {
      if (e.target.classList.contains("inventory-slot") && e.target.dataset.itemType) {
        this.useItemAuto(e.target.dataset.itemType)
      }
    })
  }

  addDemoPlayers() {
    const demoPlayers = [
      { id: "player1", name: "Player1", skin: "🤖", health: 85, position: { x: 800, y: 900 } },
      { id: "player2", name: "Player2", skin: "🐱", health: 92, position: { x: 1200, y: 800 } },
      { id: "player3", name: "Player3", skin: "🐶", health: 78, position: { x: 900, y: 1100 } },
    ]

    demoPlayers.forEach((player) => {
      this.gameState.players.set(player.id, {
        ...player,
        inventory: [],
      })
    })
  }

  generateWords() {
    // Clear existing words
    this.gameState.words = []

    // Generate random words across the map
    const wordCount = 20
    for (let i = 0; i < wordCount; i++) {
      const wordType = Object.keys(this.wordLists)[Math.floor(Math.random() * Object.keys(this.wordLists).length)]
      const wordList = this.wordLists[wordType]
      const word = wordList[Math.floor(Math.random() * wordList.length)]

      this.gameState.words.push({
        id: i,
        text: word,
        type: wordType,
        position: {
          x: Math.random() * this.gameState.mapSize.width,
          y: Math.random() * this.gameState.mapSize.height,
        },
        color: this.getWordColor(wordType),
      })
    }
  }

  getWordColor(type) {
    const colors = {
      attack: "#e74c3c",
      heal: "#2ecc71",
      speed: "#3498db",
      shield: "#f39c12",
      item: "#9b59b6",
    }
    return colors[type] || "#2c3e50"
  }

  submitWord() {
    const input = document.getElementById("typingField")
    const word = input.value.trim()

    if (!word) return

    // Find matching word in view
    const matchedWord = this.findWordInView(word)
    if (matchedWord) {
      this.processWordEffect(matchedWord)
      this.removeWord(matchedWord.id)
      this.generateNewWord()
    }

    input.value = ""
  }

  findWordInView(inputWord) {
    if (!this.currentUser) return null

    const viewDistance = 300 // Distance player can see words

    return this.gameState.words.find((word) => {
      const distance = Math.sqrt(
        Math.pow(word.position.x - this.currentUser.position.x, 2) +
          Math.pow(word.position.y - this.currentUser.position.y, 2),
      )
      return distance <= viewDistance && word.text === inputWord
    })
  }

  processWordEffect(word) {
    if (!this.currentUser) return

    switch (word.type) {
      case "attack":
        this.attackNearestPlayer()
        break
      case "heal":
        this.healPlayer(this.currentUser)
        break
      case "speed":
        this.applySpeedBoost(this.currentUser)
        break
      case "shield":
        this.applyShield(this.currentUser)
        break
      case "item":
        this.giveRandomItem(this.currentUser)
        break
    }
  }

  attackNearestPlayer() {
    let nearestPlayer = null
    let nearestDistance = Number.POSITIVE_INFINITY

    this.gameState.players.forEach((player) => {
      if (player.id !== this.currentUser.id) {
        const distance = Math.sqrt(
          Math.pow(player.position.x - this.currentUser.position.x, 2) +
            Math.pow(player.position.y - this.currentUser.position.y, 2),
        )
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestPlayer = player
        }
      }
    })

    if (nearestPlayer && nearestDistance <= 400) {
      nearestPlayer.health = Math.max(0, nearestPlayer.health - 20)
      this.showEffect(nearestPlayer.position, "💥", "#e74c3c")
    }
  }

  healPlayer(player) {
    player.health = Math.min(100, player.health + 25)
    this.showEffect(player.position, "💚", "#2ecc71")
  }

  applySpeedBoost(player) {
    this.showEffect(player.position, "⚡", "#3498db")
    // Speed boost would be implemented in movement logic
  }

  applyShield(player) {
    this.showEffect(player.position, "🛡️", "#f39c12")
    // Shield effect would be implemented in damage logic
  }

  giveRandomItem(player) {
    const itemTypes = Object.keys(this.itemTypes)
    const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)]

    if (player.inventory.length < 9) {
      player.inventory.push({
        type: randomType,
        ...this.itemTypes[randomType],
      })
      this.updateInventory()
      this.showEffect(player.position, "✨", "#9b59b6")
    }
  }

  useItemOnPlayer(itemType, targetPlayerId) {
    const targetPlayer = this.gameState.players.get(targetPlayerId)
    if (!targetPlayer) return

    switch (itemType) {
      case "heal":
        this.healPlayer(targetPlayer)
        break
      case "attack":
        targetPlayer.health = Math.max(0, targetPlayer.health - 30)
        this.showEffect(targetPlayer.position, "💥", "#e74c3c")
        break
      case "speed":
        this.applySpeedBoost(targetPlayer)
        break
      case "shield":
        this.applyShield(targetPlayer)
        break
    }

    this.removeItemFromInventory(itemType)
  }

  useItemAuto(itemType) {
    if (itemType === "heal" || itemType === "speed" || itemType === "shield") {
      // Use on self
      this.useItemOnPlayer(itemType, this.currentUser.id)
    } else if (itemType === "attack") {
      // Use on nearest enemy
      this.attackNearestPlayer()
      this.removeItemFromInventory(itemType)
    }
  }

  removeItemFromInventory(itemType) {
    if (!this.currentUser) return

    const itemIndex = this.currentUser.inventory.findIndex((item) => item.type === itemType)
    if (itemIndex !== -1) {
      this.currentUser.inventory.splice(itemIndex, 1)
      this.updateInventory()
    }
  }

  showEffect(position, emoji, color) {
    // Visual effect would be rendered on canvas
    console.log(`Effect at ${position.x}, ${position.y}: ${emoji}`)
  }

  removeWord(wordId) {
    this.gameState.words = this.gameState.words.filter((word) => word.id !== wordId)
  }

  generateNewWord() {
    const wordType = Object.keys(this.wordLists)[Math.floor(Math.random() * Object.keys(this.wordLists).length)]
    const wordList = this.wordLists[wordType]
    const word = wordList[Math.floor(Math.random() * wordList.length)]

    this.gameState.words.push({
      id: Date.now(),
      text: word,
      type: wordType,
      position: {
        x: Math.random() * this.gameState.mapSize.width,
        y: Math.random() * this.gameState.mapSize.height,
      },
      color: this.getWordColor(wordType),
    })
  }

  updatePlayerInfo() {
    if (!this.currentUser) return

    document.getElementById("gamePlayerAvatar").textContent = this.currentUser.skin
    document.getElementById("gamePlayerName").textContent = this.currentUser.name
    document.getElementById("healthFill").style.width = this.currentUser.health + "%"
    document.getElementById("healthText").textContent = this.currentUser.health
  }

  updatePlayerList() {
    const container = document.getElementById("playersContainer")
    container.innerHTML = ""

    let rank = 1
    this.gameState.players.forEach((player) => {
      const playerItem = document.createElement("div")
      playerItem.className = "player-item"

      playerItem.innerHTML = `
                <div class="player-item-avatar" data-player-id="${player.id}">${player.skin}</div>
                <div class="player-item-info">
                    <div class="player-item-name">#${rank} ${player.name}</div>
                    <div class="player-item-health">
                        <div class="player-item-health-fill" style="width: ${player.health}%"></div>
                    </div>
                </div>
            `

      container.appendChild(playerItem)
      rank++
    })
  }

  updateInventory() {
    if (!this.currentUser) return

    const grid = document.getElementById("inventoryGrid")
    grid.innerHTML = ""

    // Create 9 slots
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement("div")
      slot.className = "inventory-slot"
      slot.draggable = true

      if (i < this.currentUser.inventory.length) {
        const item = this.currentUser.inventory[i]
        slot.classList.add("filled")
        slot.textContent = item.emoji
        slot.title = item.name
        slot.dataset.itemType = item.type
      }

      grid.appendChild(slot)
    }
  }

  startGameLoop() {
    const gameLoop = () => {
      this.update()
      this.render()
      requestAnimationFrame(gameLoop)
    }
    gameLoop()
  }

  update() {
    if (this.currentUser) {
      this.updatePlayerInfo()
      this.updatePlayerList()

      // Update camera to follow player
      if (!this.isSpectator) {
        this.gameState.camera.x = this.currentUser.position.x - this.canvas.width / 2
        this.gameState.camera.y = this.currentUser.position.y - this.canvas.height / 2
      }
    }
  }

  render() {
    if (!this.ctx) return

    // Clear canvas
    this.ctx.fillStyle = "#34495e"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw grid
    this.drawGrid()

    // Draw words
    this.drawWords()

    // Draw players
    this.drawPlayers()

    // Draw UI elements
    this.drawMinimap()
  }

  drawGrid() {
    this.ctx.strokeStyle = "#2c3e50"
    this.ctx.lineWidth = 1

    const gridSize = 100
    const startX = -this.gameState.camera.x % gridSize
    const startY = -this.gameState.camera.y % gridSize

    for (let x = startX; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.canvas.height)
      this.ctx.stroke()
    }

    for (let y = startY; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.canvas.width, y)
      this.ctx.stroke()
    }
  }

  drawWords() {
    this.gameState.words.forEach((word) => {
      const screenX = word.position.x - this.gameState.camera.x
      const screenY = word.position.y - this.gameState.camera.y

      // Only draw if on screen
      if (screenX > -100 && screenX < this.canvas.width + 100 && screenY > -100 && screenY < this.canvas.height + 100) {
        this.ctx.fillStyle = word.color
        this.ctx.font = "bold 24px Arial"
        this.ctx.textAlign = "center"
        this.ctx.fillText(word.text, screenX, screenY)

        // Draw word background
        const metrics = this.ctx.measureText(word.text)
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        this.ctx.fillRect(screenX - metrics.width / 2 - 5, screenY - 20, metrics.width + 10, 25)

        this.ctx.fillStyle = word.color
        this.ctx.fillText(word.text, screenX, screenY)
      }
    })
  }

  drawPlayers() {
    this.gameState.players.forEach((player) => {
      const screenX = player.position.x - this.gameState.camera.x
      const screenY = player.position.y - this.gameState.camera.y

      // Only draw if on screen
      if (screenX > -100 && screenX < this.canvas.width + 100 && screenY > -100 && screenY < this.canvas.height + 100) {
        // Draw player avatar
        this.ctx.font = "40px Arial"
        this.ctx.textAlign = "center"
        this.ctx.fillText(player.skin, screenX, screenY)

        // Draw player name
        this.ctx.fillStyle = "#2c3e50"
        this.ctx.font = "bold 14px Arial"
        this.ctx.fillText(player.name, screenX, screenY + 30)

        // Draw health bar
        const barWidth = 60
        const barHeight = 8

        this.ctx.fillStyle = "#e74c3c"
        this.ctx.fillRect(screenX - barWidth / 2, screenY + 35, barWidth, barHeight)

        this.ctx.fillStyle = "#2ecc71"
        this.ctx.fillRect(screenX - barWidth / 2, screenY + 35, (barWidth * player.health) / 100, barHeight)

        // Draw view range for current player
        if (player === this.currentUser) {
          this.ctx.strokeStyle = "rgba(108, 92, 231, 0.3)"
          this.ctx.lineWidth = 2
          this.ctx.beginPath()
          this.ctx.arc(screenX, screenY, 300, 0, Math.PI * 2)
          this.ctx.stroke()
        }
      }
    })
  }

  drawMinimap() {
    const minimapSize = 150
    const minimapX = this.canvas.width - minimapSize - 20
    const minimapY = 20

    // Draw minimap background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    this.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize)

    // Draw players on minimap
    this.gameState.players.forEach((player) => {
      const mapX = minimapX + (player.position.x / this.gameState.mapSize.width) * minimapSize
      const mapY = minimapY + (player.position.y / this.gameState.mapSize.height) * minimapSize

      this.ctx.fillStyle = player === this.currentUser ? "#6c5ce7" : "#74b9ff"
      this.ctx.beginPath()
      this.ctx.arc(mapX, mapY, 3, 0, Math.PI * 2)
      this.ctx.fill()
    })

    // Draw camera view on minimap
    const viewX = minimapX + (this.gameState.camera.x / this.gameState.mapSize.width) * minimapSize
    const viewY = minimapY + (this.gameState.camera.y / this.gameState.mapSize.height) * minimapSize
    const viewW = (this.canvas.width / this.gameState.mapSize.width) * minimapSize
    const viewH = (this.canvas.height / this.gameState.mapSize.height) * minimapSize

    this.ctx.strokeStyle = "#fdcb6e"
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(viewX, viewY, viewW, viewH)
  }
}

// Initialize the game when the page loads
window.addEventListener("DOMContentLoaded", () => {
  new TypingBattleGame()
})
