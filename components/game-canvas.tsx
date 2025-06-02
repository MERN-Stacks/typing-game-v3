"use client"

import { useEffect, useRef, useCallback } from "react"
import type { GameState, Player } from "@/types/game"

interface GameCanvasProps {
  gameState: GameState
  currentUser: Player | null
  isSpectator: boolean
  onUpdatePlayer: (playerId: string, updates: Partial<Player>) => void
  onUpdateGameState: (updates: Partial<GameState>) => void
}

export default function GameCanvas({
  gameState,
  currentUser,
  isSpectator,
  onUpdatePlayer,
  onUpdateGameState,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }, [])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [resizeCanvas])

  const setupCanvasEvents = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let isMouseDown = false
    let lastMousePos = { x: 0, y: 0 }
    let isDragging = false

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown = true
      lastMousePos = { x: e.clientX, y: e.clientY }
      isDragging = false
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseDown) {
        const deltaX = e.clientX - lastMousePos.x
        const deltaY = e.clientY - lastMousePos.y

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          isDragging = true

          if (!isSpectator && currentUser) {
            // Move player
            const newX = Math.max(50, Math.min(gameState.mapSize.width - 50, currentUser.position.x - deltaX))
            const newY = Math.max(50, Math.min(gameState.mapSize.height - 50, currentUser.position.y - deltaY))

            onUpdatePlayer(currentUser.id, {
              position: { x: newX, y: newY },
            })
          } else {
            // Move camera for spectator
            onUpdateGameState({
              camera: {
                x: gameState.camera.x - deltaX,
                y: gameState.camera.y - deltaY,
              },
            })
          }
        }

        lastMousePos = { x: e.clientX, y: e.clientY }
      }
    }

    const handleMouseUp = () => {
      isMouseDown = false
      setTimeout(() => {
        isDragging = false
      }, 100)
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
    }
  }, [gameState, currentUser, isSpectator, onUpdatePlayer, onUpdateGameState])

  useEffect(() => {
    const cleanup = setupCanvasEvents()
    return cleanup
  }, [setupCanvasEvents])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    // Clear canvas
    ctx.fillStyle = "#34495e"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Update camera to follow player
    let camera = gameState.camera
    if (!isSpectator && currentUser) {
      camera = {
        x: currentUser.position.x - canvas.width / 2,
        y: currentUser.position.y - canvas.height / 2,
      }
    }

    // Draw grid
    ctx.strokeStyle = "#2c3e50"
    ctx.lineWidth = 1
    const gridSize = 100
    const startX = -camera.x % gridSize
    const startY = -camera.y % gridSize

    for (let x = startX; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    for (let y = startY; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Draw words
    gameState.words.forEach((word) => {
      const screenX = word.position.x - camera.x
      const screenY = word.position.y - camera.y

      if (screenX > -100 && screenX < canvas.width + 100 && screenY > -100 && screenY < canvas.height + 100) {
        // Draw word background
        ctx.font = "bold 24px Arial"
        ctx.textAlign = "center"
        const metrics = ctx.measureText(word.text)

        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        ctx.fillRect(screenX - metrics.width / 2 - 5, screenY - 20, metrics.width + 10, 25)

        ctx.fillStyle = word.color
        ctx.fillText(word.text, screenX, screenY)
      }
    })

    // Draw players
    gameState.players.forEach((player) => {
      const screenX = player.position.x - camera.x
      const screenY = player.position.y - camera.y

      if (screenX > -100 && screenX < canvas.width + 100 && screenY > -100 && screenY < canvas.height + 100) {
        // Draw player avatar
        ctx.font = "40px Arial"
        ctx.textAlign = "center"
        ctx.fillText(player.skin, screenX, screenY)

        // Draw player name
        ctx.fillStyle = "#2c3e50"
        ctx.font = "bold 14px Arial"
        ctx.fillText(player.name, screenX, screenY + 30)

        // Draw health bar
        const barWidth = 60
        const barHeight = 8

        ctx.fillStyle = "#e74c3c"
        ctx.fillRect(screenX - barWidth / 2, screenY + 35, barWidth, barHeight)

        ctx.fillStyle = "#2ecc71"
        ctx.fillRect(screenX - barWidth / 2, screenY + 35, (barWidth * player.health) / 100, barHeight)

        // Draw view range for current player
        if (player === currentUser) {
          ctx.strokeStyle = "rgba(108, 92, 231, 0.3)"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(screenX, screenY, 300, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    })

    // Draw minimap
    const minimapSize = 150
    const minimapX = canvas.width - minimapSize - 20
    const minimapY = 20

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize)

    // Draw players on minimap
    gameState.players.forEach((player) => {
      const mapX = minimapX + (player.position.x / gameState.mapSize.width) * minimapSize
      const mapY = minimapY + (player.position.y / gameState.mapSize.height) * minimapSize

      ctx.fillStyle = player === currentUser ? "#6c5ce7" : "#74b9ff"
      ctx.beginPath()
      ctx.arc(mapX, mapY, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw camera view on minimap
    const viewX = minimapX + (camera.x / gameState.mapSize.width) * minimapSize
    const viewY = minimapY + (camera.y / gameState.mapSize.height) * minimapSize
    const viewW = (canvas.width / gameState.mapSize.width) * minimapSize
    const viewH = (canvas.height / gameState.mapSize.height) * minimapSize

    ctx.strokeStyle = "#fdcb6e"
    ctx.lineWidth = 2
    ctx.strokeRect(viewX, viewY, viewW, viewH)

    animationFrameRef.current = requestAnimationFrame(render)
  }, [gameState, currentUser, isSpectator])

  useEffect(() => {
    render()
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [render])

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-move" style={{ touchAction: "none" }} />
  )
}
