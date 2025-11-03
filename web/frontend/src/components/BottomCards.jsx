import React from 'react'
import { Package, Eye, EyeOff } from 'lucide-react'
import Card from './Card'

function BottomCards({ bottomCards, gamePhase, isDealer, canViewBottom = false }) {
  const shouldShowCards = canViewBottom || (gamePhase && gamePhase === 'bottom_reveal')
  
  if (!bottomCards) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-800">底牌</h3>
        </div>
        <div className="text-center text-gray-500 mt-8">
          <p>发牌中...</p>
        </div>
      </div>
    )
  }

  if (bottomCards.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-800">底牌</h3>
        </div>
        <div className="text-center text-gray-500 mt-8">
          <p>暂无底牌</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-800">底牌</h3>
        <span className="text-sm text-gray-500">({bottomCards.length}张)</span>
      </div>

      {!shouldShowCards && (
        <div className="flex items-center gap-2 mb-3 text-sm text-amber-600 bg-amber-50 p-2 rounded">
          <EyeOff className="w-4 h-4" />
          <span>底牌暂不可见</span>
        </div>
      )}

      {shouldShowCards && isDealer && (
        <div className="flex items-center gap-2 mb-3 text-sm text-green-600 bg-green-50 p-2 rounded">
          <Eye className="w-4 h-4" />
          <span>庄家可查看底牌</span>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {shouldShowCards ? (
          <div className="grid grid-cols-2 gap-2">
            {bottomCards.map((card, index) => (
              <div key={index} className="flex justify-center">
                <div className="scale-75 origin-center">
                  <Card 
                    card={card} 
                    isSelected={false} 
                    isClickable={false} 
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {bottomCards.map((_, index) => (
              <div key={index} className="flex justify-center">
                <div className="scale-75 origin-center">
                  <div className="w-16 h-24 bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg border-2 border-gray-300 shadow-md flex items-center justify-center">
                    <div className="text-white text-xs opacity-60">?</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>3副牌(162张) - 4人×39张 + 6张底牌</p>
          {shouldShowCards && (
            <p className="mt-1 text-green-600">庄家埋底阶段</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default BottomCards