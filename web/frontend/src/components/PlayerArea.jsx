import React from 'react'
import Card from './Card'
import { Play, Crown, Bot } from 'lucide-react'
import { getSortedHandCards } from '../utils/cardSorting'

// 判断是否为主牌的辅助函数
function isTrumpCard(card, trumpSuit, trumpRank) {
  const { suit, rank } = card
  
  // 大小王永远是主牌
  if (rank === '大王' || rank === '小王') {
    return true
  }
  
  // 所有2都是主牌
  if (rank === '2') {
    return true
  }
  
  // 级牌都是主牌
  if (rank === trumpRank) {
    return true
  }
  
  // 主花色的牌是主牌
  if (trumpSuit && suit === trumpSuit) {
    return true
  }
  
  return false
}

function PlayerArea({ player, isCurrentPlayer, isSelf, selectedCards, onCardSelect, onPlayCards, trumpSuit, trumpRank }) {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 transition-all ${
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
              {player.name && player.name.startsWith('AI_') && <Bot className="w-4 h-4 text-blue-500" title="AI玩家" />}
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

      {/* Hand Cards - 叠放显示 */}
      {player.hand && player.hand.length > 0 && (
        <div className="relative h-36 mt-4 overflow-x-auto overflow-y-visible">
          <div className="relative h-full" style={{ minWidth: 'max-content' }}>
            {(() => {
              // 获取排序后的手牌
              const sortedCards = getSortedHandCards(player.hand, trumpSuit, trumpRank)
              
              // 创建更可靠的索引映射
              const indexMap = new Map()
              
              // 创建原始牌的带索引副本，用于匹配
              const originalCardsWithIndex = player.hand.map((card, index) => ({
                ...card,
                originalIndex: index,
                uniqueId: `${card.suit}-${card.rank}-${index}` // 使用索引确保唯一性
              }))
              
              // 为每张排序后的牌找到对应的原始索引
              sortedCards.forEach((sortedCard, sortedIndex) => {
                // 找到第一个匹配且未被使用的原始牌
                const matchIndex = originalCardsWithIndex.findIndex(originalCard => 
                  originalCard && 
                  originalCard.suit === sortedCard.suit && 
                  originalCard.rank === sortedCard.rank
                )
                
                if (matchIndex !== -1) {
                  const originalIndex = originalCardsWithIndex[matchIndex].originalIndex
                  indexMap.set(sortedIndex, originalIndex)
                  // 标记为已使用，避免重复映射
                  originalCardsWithIndex[matchIndex] = null
                } else {
                  console.error(`Failed to map sorted card[${sortedIndex}]: ${sortedCard.suit}${sortedCard.rank}`)
                }
              })
              
              // 计算卡片间距 - 根据手牌数量动态调整
              const cardCount = sortedCards.length
              const containerWidth = 800 // 预估容器宽度
              const cardWidth = 80 // 卡片宽度（w-20 = 5rem = 80px）
              
              // 计算理想间距，让所有牌能在容器内显示
              let spacing
              if (cardCount === 1) {
                spacing = 0
              } else {
                const availableSpace = containerWidth - cardWidth
                const maxSpacing = 40 // 最大间距
                const minSpacing = 25 // 最小间距（确保能看到花色）
                spacing = Math.min(maxSpacing, Math.max(minSpacing, availableSpace / (cardCount - 1)))
              }
              
              return sortedCards.map((card, sortedIndex) => {
                const originalIndex = indexMap.get(sortedIndex)
                
                // 如果索引映射失败，跳过这张牌
                if (originalIndex === undefined) {
                  console.error(`Failed to map sorted index ${sortedIndex} for card ${card.suit}${card.rank}`)
                  return null
                }
                
                // 只有自己的牌才能被选中
                const isSelected = isSelf && selectedCards.includes(originalIndex)
                
                return (
                  <div
                    key={`sorted-${sortedIndex}-${card.suit}-${card.rank}-${originalIndex}`}
                    className="absolute transition-all duration-200"
                    style={{
                      left: `${sortedIndex * spacing}px`,
                      zIndex: isSelected ? 100 + sortedIndex : sortedIndex,
                      transform: isSelected ? 'translateY(-20px)' : 'translateY(0)'
                    }}
                  >
                    <Card
                      card={card}
                      isSelected={isSelected}
                      onClick={() => {
                        if (isSelf && isCurrentPlayer) {
                          onCardSelect(originalIndex)
                        }
                      }}
                      isClickable={isSelf && isCurrentPlayer}
                      isTrump={isTrumpCard(card, trumpSuit, trumpRank)}
                    />
                  </div>
                )
              })
            })()}
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
