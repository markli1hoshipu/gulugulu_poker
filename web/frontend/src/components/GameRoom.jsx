import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import PlayerArea from './PlayerArea'
import GameBoard from './GameBoard'
import ScoreBoard from './ScoreBoard'
import WaitingRoom from './WaitingRoom'

function GameRoom({ socket, playerName }) {
  const [gameState, setGameState] = useState(null)
  const [selectedCards, setSelectedCards] = useState([])

  useEffect(() => {
    if (!socket) return

    // Request initial game state
    socket.emit('request_game_state')

    // Listen for game state updates
    socket.on('game_state', (state) => {
      console.log('Game state updated:', state)
      setGameState(state)
      setSelectedCards([]) // Clear selection on state update
    })

    socket.on('play_error', (data) => {
      toast.error(data.message)
    })

    socket.on('round_complete', (data) => {
      toast.success('本轮结束！')
    })

    socket.on('game_complete', (data) => {
      toast.success('游戏结束！')
    })

    return () => {
      socket.off('game_state')
      socket.off('play_error')
      socket.off('round_complete')
      socket.off('game_complete')
    }
  }, [socket])

  const handleCardSelect = (index) => {
    setSelectedCards(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      } else {
        return [...prev, index]
      }
    })
  }

  const handlePlayCards = () => {
    if (selectedCards.length === 0) {
      toast.error('请选择至少一张牌')
      return
    }

    socket.emit('play_cards', { card_indices: selectedCards })
  }

  const handleRestart = () => {
    socket.emit('restart_game')
    toast.success('游戏已重置')
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    )
  }

  if (!gameState.started) {
    return <WaitingRoom gameState={gameState} playerName={playerName} />
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">咕噜咕噜扑克</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">主花色:</span>{' '}
                <span className="text-lg">{gameState.trump_suit || '无'}</span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-semibold">级别:</span>{' '}
                <span className="font-medium">{gameState.trump_rank}</span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-semibold">轮数:</span>{' '}
                <span className="font-medium">{gameState.round_number}</span>
              </div>
              <button
                onClick={handleRestart}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                重新开始
              </button>
            </div>
          </div>
        </div>

        {/* Score Board */}
        <ScoreBoard teamScores={gameState.team_scores} />

        {/* Game Board - Current Trick */}
        <GameBoard
          currentTrick={gameState.current_trick}
          players={gameState.players}
          leadPlayer={gameState.lead_player}
        />

        {/* Players */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {gameState.players && gameState.players.map(player => (
            <PlayerArea
              key={player.id}
              player={player}
              isCurrentPlayer={player.id === gameState.current_player}
              isSelf={player.name === playerName}
              selectedCards={selectedCards}
              onCardSelect={handleCardSelect}
              onPlayCards={handlePlayCards}
            />
          ))}
        </div>

        {/* Game Over */}
        {gameState.game_over && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md">
              <h2 className="text-3xl font-bold text-center mb-4">游戏结束！</h2>
              <div className="text-center mb-6">
                <p className="text-xl mb-2">最终得分:</p>
                <p className="text-lg">
                  <span className="font-semibold">甲队:</span> {gameState.team_scores[0]}分
                </p>
                <p className="text-lg">
                  <span className="font-semibold">乙队:</span> {gameState.team_scores[1]}分
                </p>
              </div>
              <button
                onClick={handleRestart}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition"
              >
                再来一局
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameRoom
