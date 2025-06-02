"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GameCanvas from "@/components/game-canvas"
import GameUI from "@/components/game-ui"
import type { GameState, Player, Word } from "@/types/game"

export default function GamePage() {
  const router = useRouter()
  const [gameState, setGameState] = useState<GameState>({
    players: new Map(),
    words: [],
    items: [],
    camera: { x: 0, y: 0 },
    mapSize: { width: 2000, height: 2000 },
  })
  const [currentUser, setCurrentUser] = useState<Player | null>(null)
  const [isSpectator, setIsSpectator] = useState(false)

  useEffect(() => {
    // Check if user data exists
    const userData = sessionStorage.getItem("currentUser")
    const spectatorMode = sessionStorage.getItem("isSpectator")

    if (spectatorMode === "true") {
      setIsSpectator(true)
    } else if (userData) {
      const user = JSON.parse(userData)
      setCurrentUser(user)

      // Add user to game state
      setGameState((prev) => {
        const newPlayers = new Map(prev.players)
        newPlayers.set(user.id, user)
        return { ...prev, players: newPlayers }
      })
    } else {
      // No user data, redirect to login
      router.push("/")
      return
    }

    // Add demo players
    addDemoPlayers()
    generateWords()
  }, [router])

  const addDemoPlayers = () => {
    const demoPlayers = [
      { id: "player1", name: "Player1", skin: "🤖", health: 85, position: { x: 800, y: 900 }, inventory: [] },
      { id: "player2", name: "Player2", skin: "🐱", health: 92, position: { x: 1200, y: 800 }, inventory: [] },
      { id: "player3", name: "Player3", skin: "🐶", health: 78, position: { x: 900, y: 1100 }, inventory: [] },
    ]

    setGameState((prev) => {
      const newPlayers = new Map(prev.players)
      demoPlayers.forEach((player) => {
        newPlayers.set(player.id, player)
      })
      return { ...prev, players: newPlayers }
    })
  }

  const generateWords = () => {
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

    const words: Word[] = []
    const wordCount = 20

    for (let i = 0; i < wordCount; i++) {
      const wordTypes = Object.keys(wordLists)
      const wordType = wordTypes[Math.floor(Math.random() * wordTypes.length)]
      const wordList = wordLists[wordType as keyof typeof wordLists]
      const word = wordList[Math.floor(Math.random() * wordList.length)]

      words.push({
        id: i,
        text: word,
        type: wordType,
        position: {
          x: Math.random() * 2000,
          y: Math.random() * 2000,
        },
        color: getWordColor(wordType),
      })
    }

    setGameState((prev) => ({ ...prev, words }))
  }

  const handleExitGame = () => {
    sessionStorage.removeItem("currentUser")
    sessionStorage.removeItem("isSpectator")
    router.push("/")
  }

  const updatePlayer = (playerId: string, updates: Partial<Player>) => {
    setGameState((prev) => {
      const newPlayers = new Map(prev.players)
      const player = newPlayers.get(playerId)
      if (player) {
        newPlayers.set(playerId, { ...player, ...updates })
      }
      return { ...prev, players: newPlayers }
    })

    if (currentUser && playerId === currentUser.id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null))
    }
  }

  const updateGameState = (updates: Partial<GameState>) => {
    setGameState((prev) => ({ ...prev, ...updates }))
  }

  if (!currentUser && !isSpectator) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-800">
      <GameCanvas
        gameState={gameState}
        currentUser={currentUser}
        isSpectator={isSpectator}
        onUpdatePlayer={updatePlayer}
        onUpdateGameState={updateGameState}
      />

      <GameUI
        gameState={gameState}
        currentUser={currentUser}
        isSpectator={isSpectator}
        onExitGame={handleExitGame}
        onUpdatePlayer={updatePlayer}
        onUpdateGameState={updateGameState}
      />
    </div>
  )
}
