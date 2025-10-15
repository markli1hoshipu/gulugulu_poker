import React from 'react'
import { Users, Clock } from 'lucide-react'

function WaitingRoom({ gameState, playerName }) {
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
                    </p>
                    <p className="text-sm text-gray-600">
                      {index % 2 === 0 ? '甲队' : '乙队'}
                    </p>
                  </div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
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

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            当4名玩家全部加入后，游戏将自动开始
          </p>
        </div>
      </div>
    </div>
  )
}

export default WaitingRoom
