"use client"

import type React from "react"

import { useState } from "react"
import type { GameState, Player } from "@/types/game"

interface GameUIProps {
  gameState: GameState
  currentUser: Player | null
  isSpectator: boolean
  onExitGame: () => void
  onUpdatePlayer: (playerId: string, updates: Partial<Player>) => void
  onUpdateGameState: (updates: Partial<GameState>) => void
}

export default function GameUI({
  gameState,
  currentUser,
  isSpectator,
  onExitGame,
  onUpdatePlayer,
  onUpdateGameState,
}: GameUIProps) {
  const [typingInput, setTypingInput] = useState("")

  const handleSubmitWord = () => {
    if (!typingInput.trim() || !currentUser) return

    // Find matching word in view
    const matchedWord = findWordInView(typingInput.trim())
    if (matchedWord) {
      processWordEffect(matchedWord)
      removeWord(matchedWord.id)
      generateNewWord()
    }

    setTypingInput("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmitWord()
    }
  }

  const findWordInView = (inputWord: string) => {
    if (!currentUser) return null

    const viewDistance = 300
    return gameState.words.find((word) => {
      const distance = Math.sqrt(
        Math.pow(word.position.x - currentUser.position.x, 2) + Math.pow(word.position.y - currentUser.position.y, 2),
      )
      return distance <= viewDistance && word.text === inputWord
    })
  }

  const processWordEffect = (word: any) => {
    if (!currentUser) return

    switch (word.type) {
      case "attack":
        attackNearestPlayer()
        break
      case "heal":
        healPlayer(currentUser)
        break
      case "speed":
        applySpeedBoost(currentUser)
        break
      case "shield":
        applyShield(currentUser)
        break
      case "item":
        giveRandomItem(currentUser)
        break
    }
  }

  const attackNearestPlayer = () => {
    if (!currentUser) return

    let nearestPlayer = null
    let nearestDistance = Number.POSITIVE_INFINITY

    gameState.players.forEach((player) => {
      if (player.id !== currentUser.id) {
        const distance = Math.sqrt(
          Math.pow(player.position.x - currentUser.position.x, 2) +
            Math.pow(player.position.y - currentUser.position.y, 2),
        )
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestPlayer = player
        }
      }
    })

    if (nearestPlayer && nearestDistance <= 400) {
      onUpdatePlayer(nearestPlayer.id, {
        health: Math.max(0, nearestPlayer.health - 20),
      })
    }
  }

  const healPlayer = (player: Player) => {
    onUpdatePlayer(player.id, {
      health: Math.min(100, player.health + 25),
    })
  }

  const applySpeedBoost = (player: Player) => {
    // Speed boost implementation
    console.log("Speed boost applied to", player.name)
  }

  const applyShield = (player: Player) => {
    // Shield implementation
    console.log("Shield applied to", player.name)
  }

  const giveRandomItem = (player: Player) => {
    const itemTypes = ["heal", "attack", "speed", "shield"]
    const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)]

    if (player.inventory.length < 9) {
      const newInventory = [
        ...player.inventory,
        {
          type: randomType,
          emoji: getItemEmoji(randomType),
          name: getItemName(randomType),
        },
      ]

      onUpdatePlayer(player.id, { inventory: newInventory })
    }
  }

  const getItemEmoji = (type: string) => {
    const emojis = { heal: "❤️", attack: "⚔️", speed: "⚡", shield: "🛡️" }
    return emojis[type as keyof typeof emojis] || "❓"
  }

  const getItemName = (type: string) => {
    const names = { heal: "회복 포션", attack: "공격 아이템", speed: "속도 부스터", shield: "방어막" }
    return names[type as keyof typeof names] || "알 수 없는 아이템"
  }

  const removeWord = (wordId: number) => {
    onUpdateGameState({
      words: gameState.words.filter((word) => word.id !== wordId),
    })
  }

  const generateNewWord = () => {
    const wordLists = {
      attack: ["공격", "타격", "폭발", "번개", "화염"],
      heal: ["회복", "치료", "힐링", "재생", "생명"],
      speed: ["속도", "빠름", "질주", "가속", "순간"],
      shield: ["방어", "보호", "실드", "가드", "차단"],
      item: ["아이템", "보물", "선물", "상자", "보상"],
    }

    const getWordColor = (type: string) => {
      const colors = {
        attack: "#e74c3c",
        heal: "#2ecc71",
        speed: "#3498db",
        shield: "#f39c12",
        item: "#9b59b6",
      }
      return colors[type as keyof typeof colors] || "#2c3e50"
    }

    const wordTypes = Object.keys(wordLists)
    const wordType = wordTypes[Math.floor(Math.random() * wordTypes.length)]
    const wordList = wordLists[wordType as keyof typeof wordLists]
    const word = wordList[Math.floor(Math.random() * wordList.length)]

    const newWord = {
      id: Date.now(),
      text: word,
      type: wordType,
      position: {
        x: Math.random() * gameState.mapSize.width,
        y: Math.random() * gameState.mapSize.height,
      },
      color: getWordColor(wordType),
    }

    onUpdateGameState({
      words: [...gameState.words, newWord],
    })
  }

  if (isSpectator) {
    return (
      <div className="absolute top-5 left-5 z-10">
        <div className="bg-white/90 px-4 py-2 rounded-lg mb-2 font-bold">관전 모드</div>
        <button
          onClick={onExitGame}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          나가기
        </button>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Player Info (Center) */}
      {currentUser && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 p-4 rounded-2xl text-center min-w-[150px] pointer-events-auto">
          <div className="w-15 h-15 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-2xl mx-auto mb-2">
            {currentUser.skin}
          </div>
          <div className="font-bold mb-2">{currentUser.name}</div>
          <div className="w-25 h-5 bg-gray-300 rounded-full overflow-hidden relative mx-auto">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300"
              style={{ width: `${currentUser.health}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white text-shadow">
              {currentUser.health}
            </span>
          </div>
        </div>
      )}

      {/* Player List (Right) */}
      <div className="absolute top-5 right-5 bg-white/90 p-4 rounded-2xl min-w-[200px] pointer-events-auto">
        <h3 className="font-bold mb-3 text-gray-800">playerlist</h3>
        <div className="space-y-2">
          {Array.from(gameState.players.values()).map((player, index) => (
            <div key={player.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-sm">
                {player.skin}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">
                  #{index + 1} {player.name}
                </div>
                <div className="w-15 h-2 bg-gray-300 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300"
                    style={{ width: `${player.health}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory (Right Bottom) */}
      {currentUser && (
        <div className="absolute bottom-24 right-5 bg-white/90 p-4 rounded-2xl min-w-[150px] pointer-events-auto">
          <h3 className="font-bold mb-3 text-gray-800">item</h3>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, index) => {
              const item = currentUser.inventory[index]
              return (
                <div
                  key={index}
                  className={`w-10 h-10 border-2 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-purple-100 ${
                    item ? "border-purple-600 bg-purple-50" : "border-dashed border-gray-300"
                  }`}
                >
                  {item && (
                    <span className="text-lg" title={item.name}>
                      {item.emoji}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Typing Input (Bottom) */}
      <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex gap-3 bg-white/90 p-4 rounded-full shadow-lg pointer-events-auto">
        <input
          type="text"
          placeholder="입력"
          value={typingInput}
          onChange={(e) => setTypingInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-75 px-5 py-3 rounded-full bg-gray-100 text-lg outline-none focus:ring-2 focus:ring-purple-400"
          autoComplete="off"
        />
        <button
          onClick={handleSubmitWord}
          className="px-5 py-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors text-lg"
        >
          ▶
        </button>
      </div>

      {/* Exit Button */}
      <div className="absolute top-5 left-5 pointer-events-auto">
        <button
          onClick={onExitGame}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          나가기
        </button>
      </div>
    </div>
  )
}
