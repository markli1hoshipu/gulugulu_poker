import React from 'react'
import { Clock, User } from 'lucide-react'
import Card from './Card'

function PlayHistory({ playHistory, players }) {
  if (!playHistory || playHistory.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-800">出牌记录</h3>
        </div>
        <div className="text-center text-gray-500 mt-8">
          <p>暂无出牌记录</p>
        </div>
      </div>
    )
  }

  // Group plays by round/trick
  const groupedHistory = playHistory.reduce((groups, play) => {
    const key = `${play.round}-${Math.floor(playHistory.indexOf(play) / 4)}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(play)
    return groups
  }, {})

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-800">出牌记录</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4">
        {Object.entries(groupedHistory)
          .reverse() // Show most recent first
          .map(([key, plays]) => (
            <div key={key} className="border-b border-gray-200 pb-3 last:border-b-0">
              <div className="text-xs text-gray-500 mb-2">
                第 {plays[0].round} 轮 - 第 {Math.floor(playHistory.indexOf(plays[0]) / 4) + 1} 手
              </div>
              <div className="space-y-2">
                {plays.map((play, index) => {
                  const player = players?.find(p => p.id === play.player_id)
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {play.player_name}
                        </span>
                        {player && (
                          <span className="text-xs text-gray-500">
                            ({player.team === 0 ? '甲队' : '乙队'})
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {play.cards.map((card, cardIndex) => (
                          <div key={cardIndex} className="scale-50 origin-center">
                            <Card 
                              card={card} 
                              isSelected={false} 
                              isClickable={false} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

export default PlayHistory