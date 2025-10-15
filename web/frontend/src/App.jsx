import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import GameRoom from './components/GameRoom'
import JoinGame from './components/JoinGame'
import { useSocket } from './hooks/useSocket'

function App() {
  const [playerName, setPlayerName] = useState('')
  const [joined, setJoined] = useState(false)
  const socket = useSocket()

  useEffect(() => {
    if (!socket) return

    socket.on('join_success', (data) => {
      console.log('Join success:', data)
      setJoined(true)
    })

    socket.on('join_error', (data) => {
      console.error('Join error:', data)
      alert(data.message)
    })

    return () => {
      socket.off('join_success')
      socket.off('join_error')
    }
  }, [socket])

  const handleJoin = (name) => {
    if (!socket) {
      alert('未连接到服务器')
      return
    }

    setPlayerName(name)
    socket.emit('join_game', { name })
  }

  return (
    <div className="min-h-screen">
      <Toaster position="top-center" />

      {!joined ? (
        <JoinGame onJoin={handleJoin} />
      ) : (
        <GameRoom socket={socket} playerName={playerName} />
      )}
    </div>
  )
}

export default App
