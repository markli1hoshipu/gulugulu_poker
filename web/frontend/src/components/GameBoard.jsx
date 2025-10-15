import React from 'react'
import Card from './Card'

function GameBoard({ currentTrick, players, leadPlayer }) {
  if (!currentTrick || currentTrick.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-lg shadow-lg p-8 mb-4">
        <div className="text-center text-white text-opacity-70">
          <p className="text-xl">等待出牌...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-lg shadow-lg p-8 mb-4">
      <div className="text-center text-white mb-6">
        <p className="text-sm opacity-80">当前轮出牌</p>
        {leadPlayer !== undefined && (
          <p className="text-xs opacity-70 mt-1">
            领牌: {players && players[leadPlayer] ? players[leadPlayer].name : `玩家${leadPlayer}`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {currentTrick.map((play, index) => {
          const player = players && players[play.player_id]
          return (
            <div key={index} className="flex flex-col items-center gap-3">
              {/* Player info */}
              <div className="text-center">
                <p className="text-white font-semibold">
                  {player ? player.name : `玩家${play.player_id}`}
                </p>
                <p className="text-white text-opacity-70 text-sm">
                  {player && (player.team === 0 ? '甲队' : '乙队')}
                </p>
              </div>

              {/* Cards */}
              <div className="flex gap-2">
                {play.cards.map((card, cardIndex) => (
                  <Card
                    key={cardIndex}
                    card={card}
                    isSelected={false}
                    isClickable={false}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default GameBoard
