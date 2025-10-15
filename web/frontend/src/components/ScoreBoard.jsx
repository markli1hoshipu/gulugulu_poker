import React from 'react'
import { Trophy } from 'lucide-react'

function ScoreBoard({ teamScores }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
      <div className="flex items-center justify-center gap-8">
        {/* Team A */}
        <div className="flex items-center gap-4">
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
        </div>

        {/* VS */}
        <div className="text-gray-400 font-bold text-xl">VS</div>

        {/* Team B */}
        <div className="flex items-center gap-4">
          <div className="bg-green-100 px-6 py-2 rounded-lg">
            <span className="text-2xl font-bold text-green-600">
              {teamScores ? teamScores[1] : 0}
            </span>
            <span className="text-sm text-green-600 ml-1">分</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 text-lg">乙队</span>
            <Trophy className="w-6 h-6 text-green-500" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScoreBoard
