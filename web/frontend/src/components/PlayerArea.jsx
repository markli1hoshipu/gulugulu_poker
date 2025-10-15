import React from 'react'
import Card from './Card'
import { Play, Crown } from 'lucide-react'

function PlayerArea({ player, isCurrentPlayer, isSelf, selectedCards, onCardSelect, onPlayCards }) {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 transition-all ${
      isCurrentPlayer ? 'ring-4 ring-yellow-400' : ''
    } ${isSelf ? 'ring-2 ring-purple-400' : ''}`}>
      {/* Player Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
            player.team === 0 ? 'bg-blue-500' : 'bg-green-500'
          }`}>
            {player.id + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-800">{player.name}</h3>
              {isSelf && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">你</span>}
              {isCurrentPlayer && <Crown className="w-4 h-4 text-yellow-500" />}
            </div>
            <p className="text-sm text-gray-600">
              {player.team === 0 ? '甲队' : '乙队'} · {player.hand_size} 张牌
            </p>
          </div>
        </div>

        {isSelf && isCurrentPlayer && selectedCards.length > 0 && (
          <button
            onClick={onPlayCards}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition shadow-lg"
          >
            <Play className="w-4 h-4" />
            出牌 ({selectedCards.length})
          </button>
        )}
      </div>

      {/* Hand Cards */}
      {player.hand && player.hand.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-2 min-w-max">
            {player.hand.map((card, index) => (
              <Card
                key={index}
                card={card}
                isSelected={selectedCards.includes(index)}
                onClick={() => isSelf && isCurrentPlayer && onCardSelect(index)}
                isClickable={isSelf && isCurrentPlayer}
              />
            ))}
          </div>
        </div>
      )}

      {player.hand_size === 0 && (
        <div className="text-center text-gray-400 py-8">
          已出完所有牌
        </div>
      )}
    </div>
  )
}

export default PlayerArea
