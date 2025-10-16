import React from 'react'

const SUIT_SYMBOLS = {
  '♠': '♠',
  '♥': '♥',
  '♣': '♣',
  '♦': '♦',
  'JOKER': '👑'
}

const SUIT_COLORS = {
  '♠': 'text-black',
  '♣': 'text-black',
  '♥': 'text-red-600',
  '♦': 'text-red-600',
  'JOKER': 'text-purple-600'
}

function Card({ card, isSelected, onClick, isClickable, isTrump }) {
  const suit = card.suit
  const rank = card.rank
  const suitSymbol = SUIT_SYMBOLS[suit] || suit
  const colorClass = SUIT_COLORS[suit] || 'text-black'

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`
        relative w-20 h-28 bg-white rounded-lg shadow-lg border-2
        flex flex-col
        transition-all duration-200
        ${isTrump ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-white' : 'border-gray-300'}
        ${isClickable ? 'cursor-pointer hover:shadow-2xl hover:scale-105 active:scale-95' : 'cursor-default'}
        ${isSelected ? 'ring-4 ring-blue-400 shadow-2xl bg-gradient-to-br from-blue-50 to-white' : ''}
      `}
    >
      {/* 左上角花色和点数 - 更大更清晰 */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center">
        <div className={`text-lg font-bold leading-4 ${colorClass}`}>
          {rank}
        </div>
        <div className={`text-xl leading-4 ${colorClass}`}>
          {suitSymbol}
        </div>
      </div>

      {/* 中心大花色 */}
      <div className="flex-1 flex items-center justify-center">
        <div className={`text-4xl ${colorClass} opacity-80`}>
          {suitSymbol}
        </div>
      </div>

      {/* 右下角花色和点数（倒置） */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center rotate-180">
        <div className={`text-lg font-bold leading-4 ${colorClass}`}>
          {rank}
        </div>
        <div className={`text-xl leading-4 ${colorClass}`}>
          {suitSymbol}
        </div>
      </div>

      {/* 主牌标记 */}
      {isTrump && (
        <div className="absolute top-0.5 right-0.5">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  )
}

export default Card
