import React from 'react'
import { Users, Clock, Bot, X } from 'lucide-react'

function WaitingRoom({ gameState, playerName, socket }) {
  const handleAddAI = () => {
    if (socket && gameState.players_needed > 0) {
      socket.emit('add_ai_player')
    }
  }

  const handleClearAI = () => {
    if (socket) {
      socket.emit('clear_ai_players')
    }
  }

  const handleRemovePlayer = (playerId) => {
    if (socket) {
      socket.emit('remove_player_by_id', { player_id: playerId })
    }
  }

  // 检查是否有AI玩家
  const hasAIPlayers = gameState.player_list && 
    gameState.player_list.some(player => player.name.startsWith('AI_'))

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <Clock className="w-12 h-12 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            等待玩家加入...
          </h2>
          <p className="text-gray-600">
            需要 {gameState.players_needed} 名玩家才能开始游戏
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-700 mb-4">
            <Users className="w-5 h-5" />
            <span className="font-semibold">
              当前玩家 ({gameState.players_joined}/4)
            </span>
          </div>

          {gameState.player_list && gameState.player_list.map((player, index) => (
            <div
              key={player.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                player.name === playerName
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    index % 2 === 0 ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {player.id + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {player.name}
                      {player.name === playerName && (
                        <span className="ml-2 text-sm text-purple-600">(你)</span>
                      )}
                      {player.name.startsWith('AI_') && (
                        <span className="ml-2 text-sm text-blue-600">(AI)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {index % 2 === 0 ? '甲队' : '乙队'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <button
                    onClick={() => handleRemovePlayer(player.id)}
                    className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors opacity-70 hover:opacity-100"
                    title={`移除 ${player.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: gameState.players_needed }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
            >
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                <p className="text-gray-500">等待玩家...</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Controls */}
        <div className="mt-6 flex justify-center gap-4">
          {gameState.players_needed > 0 && (
            <button
              onClick={handleAddAI}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <Bot className="w-5 h-5" />
              添加AI对战 ({gameState.players_needed}个空位)
            </button>
          )}
          
          {hasAIPlayers && (
            <button
              onClick={handleClearAI}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg"
            >
              清除AI玩家
            </button>
          )}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            当4名玩家全部加入后，游戏将自动开始
          </p>
          <p className="text-xs text-blue-600 text-center mt-1">
            点击玩家右侧的 ✕ 按钮可以移除该玩家
          </p>
        </div>
      </div>
    </div>
  )
}

export default WaitingRoom
