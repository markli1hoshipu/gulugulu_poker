import React from 'react'
import { Trophy, Star } from 'lucide-react'
import Card from './Card'

function ScoreBoard({ teamScores, scoringCards }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
      <div className="grid grid-cols-3 gap-8 items-center">
        {/* Team A */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-gray-800 text-lg">甲队</span>
          </div>
          <div className="bg-blue-100 px-6 py-2 rounded-lg">
            <span className="text-2xl font-bold text-blue-600">
              {teamScores ? teamScores[0] : 0}
            </span>
            <span className="text-sm text-blue-600 ml-1">分</span>
          </div>
          
          {/* Team A Scoring Cards */}
          {scoringCards && scoringCards[0] && scoringCards[0].length > 0 && (
            <div className="w-full">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Star className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-600 font-medium">得分牌</span>
              </div>
              <div className="flex flex-wrap justify-center gap-1 max-h-24 overflow-y-auto">
                {scoringCards[0].map((card, index) => (
                  <div key={index} className="scale-50 origin-center">
                    <Card 
                      card={card} 
                      isSelected={false} 
                      isClickable={false} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* VS */}
        <div className="text-center">
          <div className="text-gray-400 font-bold text-xl mb-2">VS</div>
        </div>

        {/* Team B */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 text-lg">乙队</span>
            <Trophy className="w-6 h-6 text-green-500" />
          </div>
          <div className="bg-green-100 px-6 py-2 rounded-lg">
            <span className="text-2xl font-bold text-green-600">
              {teamScores ? teamScores[1] : 0}
            </span>
            <span className="text-sm text-green-600 ml-1">分</span>
          </div>
          
          {/* Team B Scoring Cards */}
          {scoringCards && scoringCards[1] && scoringCards[1].length > 0 && (
            <div className="w-full">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Star className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600 font-medium">得分牌</span>
              </div>
              <div className="flex flex-wrap justify-center gap-1 max-h-24 overflow-y-auto">
                {scoringCards[1].map((card, index) => (
                  <div key={index} className="scale-50 origin-center">
                    <Card 
                      card={card} 
                      isSelected={false} 
                      isClickable={false} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScoreBoard
