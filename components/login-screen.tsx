"use client"

import type React from "react"

import { useState } from "react"

interface LoginScreenProps {
  selectedSkin: string
  onStartGame: (userId: string, password: string) => void
  onShowSkinSelection: () => void
  onSpectatorMode: () => void
}

export default function LoginScreen({
  selectedSkin,
  onStartGame,
  onShowSkinSelection,
  onSpectatorMode,
}: LoginScreenProps) {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onStartGame(userId, password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white/90 p-10 rounded-3xl shadow-2xl text-center max-w-md w-full mx-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-purple-600 mb-6 drop-shadow-lg">Typing Battle</h1>
          <div className="flex justify-center gap-3 mb-8">
            <div className="text-3xl animate-bounce">🤖</div>
            <div className="text-3xl animate-bounce" style={{ animationDelay: "0.3s" }}>
              🍞
            </div>
            <div className="text-3xl animate-bounce" style={{ animationDelay: "0.6s" }}>
              💙
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="아이디"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full p-4 rounded-full bg-gray-100 text-center text-lg border-none outline-none focus:ring-2 focus:ring-purple-400"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 rounded-full bg-gray-100 text-center text-lg border-none outline-none focus:ring-2 focus:ring-purple-400"
          />

          <button
            type="submit"
            className="w-full p-4 mt-6 rounded-full bg-yellow-400 text-white text-xl font-bold hover:bg-orange-500 transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
          >
            게임 시작
          </button>
        </form>

        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={onShowSkinSelection}
            className="px-6 py-3 rounded-full bg-yellow-400 text-white hover:bg-orange-500 transition-all duration-300"
          >
            스킨 목록
          </button>
          <button
            onClick={onSpectatorMode}
            className="px-6 py-3 rounded-full bg-yellow-400 text-white hover:bg-orange-500 transition-all duration-300"
          >
            관전 모드
          </button>
          <button className="px-4 py-3 rounded-full bg-yellow-400 text-white hover:bg-orange-500 transition-all duration-300">
            ⚙️
          </button>
        </div>
      </div>

      <div className="absolute top-5 right-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-3xl shadow-xl">
          {selectedSkin}
        </div>
      </div>
    </div>
  )
}
