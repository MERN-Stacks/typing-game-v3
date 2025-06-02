"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import LoginScreen from "@/components/login-screen"
import SkinSelection from "@/components/skin-selection"

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState("login")
  const [selectedSkin, setSelectedSkin] = useState("😊")
  const router = useRouter()

  const skins = ["😊", "🤖", "🐱", "🐶", "🦊", "🐸", "🐼", "🦄", "👻", "🎃", "⭐", "🌟"]

  const handleStartGame = (userId: string, password: string) => {
    if (!userId || !password) {
      alert("Please enter both user ID and password")
      return
    }

    // Store user data in sessionStorage for the game
    sessionStorage.setItem(
      "currentUser",
      JSON.stringify({
        id: userId,
        name: userId,
        skin: selectedSkin,
        health: 100,
        position: { x: 1000, y: 1000 },
        inventory: [],
      }),
    )

    router.push("/game")
  }

  const handleSpectatorMode = () => {
    sessionStorage.setItem("isSpectator", "true")
    router.push("/game")
  }

  const handleShowSkinSelection = () => {
    setCurrentScreen("skin")
  }

  const handleBackToLogin = () => {
    setCurrentScreen("login")
  }

  const handleSkinSelect = (skin: string) => {
    setSelectedSkin(skin)
    setCurrentScreen("login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 to-orange-300">
      {currentScreen === "login" && (
        <LoginScreen
          selectedSkin={selectedSkin}
          onStartGame={handleStartGame}
          onShowSkinSelection={handleShowSkinSelection}
          onSpectatorMode={handleSpectatorMode}
        />
      )}
      {currentScreen === "skin" && (
        <SkinSelection
          skins={skins}
          selectedSkin={selectedSkin}
          onSkinSelect={handleSkinSelect}
          onBack={handleBackToLogin}
        />
      )}
    </div>
  )
}
