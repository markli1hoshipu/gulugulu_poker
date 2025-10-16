"""
AI Player Implementation - 随机出牌策略
"""
import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import random
import logging
from typing import List, Optional, Tuple
from src.core import Card, Suit, Rank, GamePhase
from src.engine import RuleEngine

logger = logging.getLogger(__name__)


class AIPlayer:
    """AI玩家类 - 实现随机但符合规则的出牌策略"""
    
    def __init__(self, player_id: int, name: str):
        self.player_id = player_id
        self.name = name
        self.is_ai = True
        
    def choose_cards_to_play(self, game_state, rule_engine: RuleEngine) -> List[int]:
        """
        AI选择要出的牌
        
        Args:
            game_state: 当前游戏状态
            rule_engine: 规则引擎
            
        Returns:
            List[int]: 要出的牌的索引列表
        """
        player = game_state.get_player(self.player_id)
        if not player or not player.hand:
            return []
            
        hand = player.hand
        current_trick = game_state.current_trick
        
        # 如果是第一个出牌（领牌）
        if not current_trick:
            return self._choose_lead_cards(hand, game_state)
        
        # 如果是跟牌
        return self._choose_follow_cards(hand, current_trick, game_state, rule_engine)
    
    def _choose_lead_cards(self, hand: List[Card], game_state) -> List[int]:
        """
        AI选择领牌 - 使用更智能的策略
        
        Args:
            hand: 手牌
            game_state: 游戏状态
            
        Returns:
            List[int]: 牌的索引
        """
        if not hand:
            return []
        
        trump_suit = game_state.trump_suit
        trump_rank = game_state.trump_rank
        
        # 将手牌按类型分组
        trump_cards = []
        side_suits = {"♠": [], "♥": [], "♦": [], "♣": []}
        
        for i, card in enumerate(hand):
            if card.is_trump(trump_suit, trump_rank):
                trump_cards.append(i)
            else:
                side_suits[card.suit.value].append(i)
        
        # 策略1: 优先出副牌中的单张（避免被拖拉机）
        for suit, indices in side_suits.items():
            if len(indices) == 1:  # 单张副牌
                logger.info(f"AI {self.name} 领牌选择单张副牌: {hand[indices[0]]} (索引: {indices[0]})")
                return [indices[0]]
        
        # 策略2: 出副牌中数量较少的花色
        non_empty_suits = [(suit, indices) for suit, indices in side_suits.items() if indices]
        if non_empty_suits:
            # 按数量排序，选择最少的
            non_empty_suits.sort(key=lambda x: len(x[1]))
            suit, indices = non_empty_suits[0]
            selected_index = random.choice(indices)
            logger.info(f"AI {self.name} 领牌选择较少副牌: {hand[selected_index]} (索引: {selected_index})")
            return [selected_index]
        
        # 策略3: 如果只有主牌，随机选择一张小主牌
        if trump_cards:
            # 尝试选择较小的主牌
            trump_powers = [(i, hand[i].get_power(trump_suit, trump_rank)) for i in trump_cards]
            trump_powers.sort(key=lambda x: x[1])  # 按牌力排序
            selected_index = trump_powers[0][0]  # 选择最小的
            logger.info(f"AI {self.name} 领牌选择小主牌: {hand[selected_index]} (索引: {selected_index})")
            return [selected_index]
        
        # 兜底: 随机选择
        selected_index = random.randint(0, len(hand) - 1)
        logger.info(f"AI {self.name} 领牌随机选择: {hand[selected_index]} (索引: {selected_index})")
        return [selected_index]
    
    def _choose_follow_cards(self, hand: List[Card], current_trick: List[Tuple], 
                           game_state, rule_engine: RuleEngine) -> List[int]:
        """
        AI选择跟牌
        
        Args:
            hand: 手牌
            current_trick: 当前轮出牌
            game_state: 游戏状态
            rule_engine: 规则引擎
            
        Returns:
            List[int]: 牌的索引
        """
        if not hand or not current_trick:
            return []
            
        # 获取领牌信息
        lead_player_id, lead_cards = current_trick[0]
        lead_count = len(lead_cards)
        
        # 尝试找到合法的出牌组合
        valid_combinations = self._find_valid_combinations(
            hand, lead_cards, lead_count, game_state, rule_engine
        )
        
        if not valid_combinations:
            logger.warning(f"AI {self.name} 找不到合法出牌组合")
            return []
        
        # 验证组合并选择最优的
        best_combination = self._select_best_combination(valid_combinations, hand, game_state)
        
        # 最终验证：使用规则引擎确认选择的牌是合法的
        if best_combination:
            player = game_state.get_player(self.player_id)
            selected_cards = [hand[i] for i in best_combination]
            is_valid, error_msg = rule_engine.validate_play(player, selected_cards)
            
            if not is_valid:
                logger.error(f"AI {self.name} 选择的牌不合法: {error_msg}, 重新随机选择")
                # 如果验证失败，从所有有效组合中随机选择
                best_combination = random.choice(valid_combinations)
        
        logger.info(f"AI {self.name} 跟牌选择: {[hand[i] for i in best_combination]} (索引: {best_combination})")
        return best_combination
    
    def _select_best_combination(self, valid_combinations: List[List[int]], hand: List[Card], game_state) -> List[int]:
        """
        从有效组合中选择最佳的出牌组合
        
        Args:
            valid_combinations: 有效的出牌组合
            hand: 手牌
            game_state: 游戏状态
            
        Returns:
            List[int]: 最佳组合的索引
        """
        if not valid_combinations:
            return []
        
        # 简单策略：优先选择较小的牌，保留大牌
        trump_suit = game_state.trump_suit
        trump_rank = game_state.trump_rank
        
        def combination_score(combination):
            # 计算组合的总牌力（越小越好，因为我们要出小牌）
            total_power = sum(hand[i].get_power(trump_suit, trump_rank) for i in combination)
            return total_power
        
        # 按分数排序，选择牌力最小的组合
        best_combination = min(valid_combinations, key=combination_score)
        return best_combination
    
    def _find_valid_combinations(self, hand: List[Card], lead_cards: List[Card], 
                               lead_count: int, game_state, rule_engine: RuleEngine) -> List[List[int]]:
        """
        找到所有合法的出牌组合
        
        Args:
            hand: 手牌
            lead_cards: 领牌
            lead_count: 领牌数量
            game_state: 游戏状态
            rule_engine: 规则引擎
            
        Returns:
            List[List[int]]: 合法组合的索引列表
        """
        valid_combinations = []
        trump_suit = game_state.trump_suit
        trump_rank = game_state.trump_rank
        
        # 获取领牌的有效花色类型
        lead_effective_suit = self._get_effective_suit(lead_cards[0], trump_suit, trump_rank)
        
        # 找到所有相同花色的牌
        same_suit_indices = []
        other_suit_indices = []
        
        for i, card in enumerate(hand):
            if self._get_effective_suit(card, trump_suit, trump_rank) == lead_effective_suit:
                same_suit_indices.append(i)
            else:
                other_suit_indices.append(i)
        
        # 如果有相同花色的牌，优先选择相同花色
        if len(same_suit_indices) >= lead_count:
            # 从相同花色牌中生成组合
            from itertools import combinations
            for combo in combinations(same_suit_indices, lead_count):
                valid_combinations.append(list(combo))
        elif same_suit_indices:
            # 如果相同花色牌不够，但有一些，则必须全部打出，剩余用其他牌补充
            remaining_count = lead_count - len(same_suit_indices)
            if remaining_count <= len(other_suit_indices):
                from itertools import combinations
                for other_combo in combinations(other_suit_indices, remaining_count):
                    combo = same_suit_indices + list(other_combo)
                    valid_combinations.append(combo)
        else:
            # 没有相同花色牌，可以随意组合
            from itertools import combinations
            for combo in combinations(range(len(hand)), lead_count):
                valid_combinations.append(list(combo))
        
        return valid_combinations
    
    def _is_valid_single_card(self, cards: List[Card], lead_cards: List[Card], game_state) -> bool:
        """
        检查单张牌是否合法
        
        Args:
            cards: 要出的牌
            lead_cards: 领牌
            game_state: 游戏状态
            
        Returns:
            bool: 是否合法
        """
        if not cards or not lead_cards:
            return False
            
        card = cards[0]
        lead_card = lead_cards[0]
        
        # 简化规则：如果有同花色就必须出同花色，否则可以出任意牌
        trump_suit = game_state.trump_suit
        trump_rank = game_state.trump_rank
        
        # 检查是否有同花色牌
        player = game_state.get_player(self.player_id)
        if not player:
            return False
            
        # 获取领牌花色
        lead_suit = self._get_effective_suit(lead_card, trump_suit, trump_rank)
        
        # 检查手中是否有相同花色的牌
        same_suit_cards = [c for c in player.hand if self._get_effective_suit(c, trump_suit, trump_rank) == lead_suit]
        
        if same_suit_cards:
            # 如果有同花色牌，必须出同花色
            return self._get_effective_suit(card, trump_suit, trump_rank) == lead_suit
        else:
            # 如果没有同花色牌，可以出任意牌
            return True
    
    def _is_valid_combination(self, cards: List[Card], lead_cards: List[Card], game_state) -> bool:
        """
        检查牌组合是否合法
        
        Args:
            cards: 要出的牌
            lead_cards: 领牌
            game_state: 游戏状态
            
        Returns:
            bool: 是否合法
        """
        # 简化实现：只要数量相同就认为合法
        return len(cards) == len(lead_cards)
    
    def _get_effective_suit(self, card: Card, trump_suit: Optional[Suit], trump_rank: Rank) -> str:
        """
        获取牌的有效花色（考虑主牌）
        
        Args:
            card: 牌
            trump_suit: 主花色
            trump_rank: 主牌级别
            
        Returns:
            str: 有效花色标识
        """
        # 大小王
        if card.is_joker():
            return "TRUMP"
            
        # 所有2都是主牌
        if card.rank == Rank.TWO:
            return "TRUMP"
            
        # 级牌都是主牌
        if card.rank == trump_rank:
            return "TRUMP"
            
        # 主花色的牌是主牌
        if trump_suit and card.suit == trump_suit:
            return "TRUMP"
            
        # 其他副牌
        return card.suit.value
    
    def should_declare_trump(self, hand: List[Card], game_state) -> Tuple[bool, List[int], Optional[str]]:
        """
        AI决定是否亮主
        
        Args:
            hand: 手牌
            game_state: 游戏状态
            
        Returns:
            Tuple[bool, List[int], Optional[str]]: (是否亮主, 牌索引, 声明花色)
        """
        # 简化策略：随机决定是否亮主
        # 如果有大王就用大王亮主
        for i, card in enumerate(hand):
            if card.rank == Rank.BIG_JOKER:
                if random.random() < 0.3:  # 30%概率亮主
                    # 随机选择一个花色
                    suits = [Suit.SPADE, Suit.HEART, Suit.DIAMOND, Suit.CLUB]
                    declared_suit = random.choice(suits)
                    logger.info(f"AI {self.name} 用大王亮主，声明花色: {declared_suit.value}")
                    return True, [i], declared_suit.value
        
        # 如果有级牌也可能亮主
        trump_rank = game_state.trump_rank
        rank_cards = [(i, card) for i, card in enumerate(hand) if card.rank == trump_rank and not card.is_joker()]
        
        if len(rank_cards) >= 2 and random.random() < 0.2:  # 20%概率用级牌亮主
            # 选择相同花色的级牌
            suit_groups = {}
            for i, card in rank_cards:
                suit = card.suit
                if suit not in suit_groups:
                    suit_groups[suit] = []
                suit_groups[suit].append(i)
            
            # 找到数量最多的花色
            max_count = max(len(indices) for indices in suit_groups.values())
            if max_count >= 2:
                for suit, indices in suit_groups.items():
                    if len(indices) == max_count:
                        logger.info(f"AI {self.name} 用级牌亮主，花色: {suit.value}")
                        return True, indices[:2], suit.value  # 出示2张
        
        return False, [], None


class AIPlayerManager:
    """AI玩家管理器"""
    
    def __init__(self):
        self.ai_players = {}  # player_id -> AIPlayer
        self.ai_counter = 1
        
    def create_ai_player(self, player_id: int) -> AIPlayer:
        """创建AI玩家"""
        ai_name = f"AI_{self.ai_counter}"
        self.ai_counter += 1
        
        ai_player = AIPlayer(player_id, ai_name)
        self.ai_players[player_id] = ai_player
        
        logger.info(f"创建AI玩家: {ai_name} (ID: {player_id})")
        return ai_player
        
    def get_ai_player(self, player_id: int) -> Optional[AIPlayer]:
        """获取AI玩家"""
        return self.ai_players.get(player_id)
        
    def is_ai_player(self, player_id: int) -> bool:
        """检查是否为AI玩家"""
        return player_id in self.ai_players
        
    def remove_ai_player(self, player_id: int):
        """移除AI玩家"""
        if player_id in self.ai_players:
            del self.ai_players[player_id]
            logger.info(f"移除AI玩家: {player_id}")
            
    def clear_all(self):
        """清除所有AI玩家"""
        self.ai_players.clear()
        self.ai_counter = 1
        logger.info("清除所有AI玩家")