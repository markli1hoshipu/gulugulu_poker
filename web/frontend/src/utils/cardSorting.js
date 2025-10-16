/**
 * 扑克牌排序工具
 * 按照升级/拖拉机规则：主牌 > 副牌，从大到小排序
 */

// 花色优先级（用于同级别排序）
const SUIT_PRIORITY = {
  '♠': 4, // 黑桃
  '♥': 3, // 红桃  
  '♦': 2, // 方块
  '♣': 1  // 梅花
}

// 牌面值优先级
const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  '小王': 15, '大王': 16
}

/**
 * 获取牌的排序权重
 * @param {Object} card - 牌对象 {suit, rank}
 * @param {string} trumpSuit - 主花色
 * @param {string} trumpRank - 主牌级别
 * @returns {number} 权重值（越大越靠前）
 */
function getCardWeight(card, trumpSuit, trumpRank) {
  const { suit, rank } = card
  
  // 1. 大王最大
  if (rank === '大王') {
    return 10000
  }
  
  // 2. 小王
  if (rank === '小王') {
    return 9999
  }
  
  // 3. 主花色的级牌
  if (rank === trumpRank && trumpSuit && suit === trumpSuit) {
    return 9500
  }
  
  // 4. 其他花色的级牌（按花色优先级）
  if (rank === trumpRank) {
    return 9000 + (SUIT_PRIORITY[suit] || 0)
  }
  
  // 5. 主花色的2
  if (rank === '2' && trumpSuit && suit === trumpSuit) {
    return 8800
  }
  
  // 6. 其他花色的2（按花色优先级）
  if (rank === '2') {
    return 8500 + (SUIT_PRIORITY[suit] || 0)
  }
  
  // 7. 其他主花色牌（按牌面大小）
  if (trumpSuit && suit === trumpSuit) {
    return 7000 + (RANK_VALUES[rank] || 0)
  }
  
  // 8. 副牌（按花色分组，花色内按大小排序）
  const suitBase = (SUIT_PRIORITY[suit] || 0) * 100
  return suitBase + (RANK_VALUES[rank] || 0)
}

/**
 * 判断是否为主牌
 * @param {Object} card - 牌对象
 * @param {string} trumpSuit - 主花色
 * @param {string} trumpRank - 主牌级别
 * @returns {boolean}
 */
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

/**
 * 排序手牌：主牌在前，副牌按花色分组，组内从大到小
 * @param {Array} cards - 牌数组
 * @param {string} trumpSuit - 主花色
 * @param {string} trumpRank - 主牌级别  
 * @returns {Array} 排序后的牌数组
 */
export function sortCards(cards, trumpSuit, trumpRank) {
  if (!cards || cards.length === 0) {
    return []
  }
  
  return [...cards].sort((a, b) => {
    const weightA = getCardWeight(a, trumpSuit, trumpRank)
    const weightB = getCardWeight(b, trumpSuit, trumpRank)
    
    // 按权重降序排列（大牌在前）
    return weightB - weightA
  })
}

/**
 * 按类型分组手牌：主牌组 + 三个副牌组
 * @param {Array} cards - 牌数组
 * @param {string} trumpSuit - 主花色
 * @param {string} trumpRank - 主牌级别
 * @returns {Object} 分组结果
 */
export function groupCardsByType(cards, trumpSuit, trumpRank) {
  if (!cards || cards.length === 0) {
    return { trump: [], spades: [], hearts: [], diamonds: [], clubs: [] }
  }
  
  const groups = {
    trump: [],
    spades: [],
    hearts: [], 
    diamonds: [],
    clubs: []
  }
  
  cards.forEach(card => {
    if (isTrumpCard(card, trumpSuit, trumpRank)) {
      groups.trump.push(card)
    } else {
      switch (card.suit) {
        case '♠':
          groups.spades.push(card)
          break
        case '♥':
          groups.hearts.push(card)
          break
        case '♦':
          groups.diamonds.push(card)
          break
        case '♣':
          groups.clubs.push(card)
          break
      }
    }
  })
  
  // 每组内部排序
  Object.keys(groups).forEach(key => {
    groups[key] = sortCards(groups[key], trumpSuit, trumpRank)
  })
  
  return groups
}

/**
 * 获取排序后的完整手牌：主牌 + 副牌组（红黑交替排列）
 * @param {Array} cards - 牌数组
 * @param {string} trumpSuit - 主花色  
 * @param {string} trumpRank - 主牌级别
 * @returns {Array} 排序后的牌数组
 */
export function getSortedHandCards(cards, trumpSuit, trumpRank) {
  const groups = groupCardsByType(cards, trumpSuit, trumpRank)
  
  // 主牌在最前面
  const result = [...groups.trump]
  
  // 副牌按红黑交替方式排列
  // 黑色花色：♠(spades), ♣(clubs)
  // 红色花色：♥(hearts), ♦(diamonds)
  
  const blackSuits = []
  const redSuits = []
  
  // 将副牌分为红黑两组，并按优先级排序
  // 黑色：黑桃优先于梅花
  if (groups.spades.length > 0) blackSuits.push({ name: 'spades', cards: groups.spades, priority: 1 })
  if (groups.clubs.length > 0) blackSuits.push({ name: 'clubs', cards: groups.clubs, priority: 2 })
  
  // 红色：红桃优先于方块
  if (groups.hearts.length > 0) redSuits.push({ name: 'hearts', cards: groups.hearts, priority: 1 })
  if (groups.diamonds.length > 0) redSuits.push({ name: 'diamonds', cards: groups.diamonds, priority: 2 })
  
  // 在各自组内按优先级排序
  blackSuits.sort((a, b) => a.priority - b.priority)
  redSuits.sort((a, b) => a.priority - b.priority)
  
  // 红黑交替排列副牌
  const maxLength = Math.max(blackSuits.length, redSuits.length)
  
  // 决定起始颜色：如果有黑桃，优先黑色开始；否则看哪种颜色多
  let startWithBlack = groups.spades.length > 0 || blackSuits.length >= redSuits.length
  
  // 如果只有一种颜色，直接添加
  if (blackSuits.length === 0) {
    // 只有红色，按优先级顺序添加
    redSuits.forEach(group => result.push(...group.cards))
  } else if (redSuits.length === 0) {
    // 只有黑色，按优先级顺序添加
    blackSuits.forEach(group => result.push(...group.cards))
  } else {
    // 有两种颜色，进行真正的红黑交替排列
    // 策略：♠ > ♥ > ♣ > ♦ 或者 ♠ > ♥ > ♦ > ♣（取决于有哪些花色）
    
    // 建立理想的交替顺序
    const idealOrder = []
    
    // 黑桃总是第一（如果有）
    const spades = blackSuits.find(g => g.name === 'spades')
    const hearts = redSuits.find(g => g.name === 'hearts')
    const clubs = blackSuits.find(g => g.name === 'clubs')
    const diamonds = redSuits.find(g => g.name === 'diamonds')
    
    // 理想顺序：黑桃 > 红桃 > 梅花 > 方块
    // 这样保证了黑-红-黑-红的交替
    if (spades) {
      idealOrder.push(spades)
    }
    
    if (hearts) {
      idealOrder.push(hearts)
    } else if (diamonds && !clubs) {
      // 如果没有红桃但有方块，且没有梅花，把方块放在黑桃后面
      idealOrder.push(diamonds)
    }
    
    if (clubs) {
      idealOrder.push(clubs)
    }
    
    if (diamonds && (hearts || clubs)) {
      // 如果有红桃或梅花，方块放在最后
      idealOrder.push(diamonds)
    }
    
    // 如果没有红桃但有方块，且有梅花，需要调整顺序
    // 例如：♠ ♣ ♦ -> ♠ ♦ ♣
    if (!hearts && diamonds && spades && clubs) {
      // 重新排序：黑桃-方块-梅花
      idealOrder.length = 0
      idealOrder.push(spades)
      idealOrder.push(diamonds)
      idealOrder.push(clubs)
    }
    
    // 将排好序的花色组添加到结果中
    idealOrder.forEach(group => {
      result.push(...group.cards)
    })
  }
  
  return result
}