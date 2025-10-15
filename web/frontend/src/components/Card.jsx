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

function Card({ card, isSelected, onClick, isClickable }) {
  const suit = card.suit
  const rank = card.rank
  const suitSymbol = SUIT_SYMBOLS[suit] || suit
  const colorClass = SUIT_COLORS[suit] || 'text-black'

  return (
    <div
      onClick={onClick}
      className={`
        relative w-16 h-24 bg-white rounded-lg shadow-md border-2 border-gray-300
        flex flex-col items-center justify-center
        transition-all duration-200
        ${isClickable ? 'cursor-pointer hover:shadow-xl hover:scale-105' : 'cursor-default'}
        ${isSelected ? 'transform -translate-y-4 ring-4 ring-yellow-400 shadow-xl' : ''}
      `}
    >
      {/* Top rank */}
      <div className={`absolute top-1 left-1 text-xs font-bold ${colorClass}`}>
        {rank}
      </div>

      {/* Center suit */}
      <div className={`text-3xl ${colorClass}`}>
        {suitSymbol}
      </div>

      {/* Bottom rank (rotated) */}
      <div className={`absolute bottom-1 right-1 text-xs font-bold ${colorClass} rotate-180`}>
        {rank}
      </div>
    </div>
  )
}

export default Card
