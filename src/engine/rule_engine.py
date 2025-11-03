"""
规则引擎
"""
from typing import List, Optional, Tuple
from collections import Counter
from ..core import Card, Suit, Rank, Player, GameState


class CardPattern:
    """牌型类"""

    def __init__(self, cards: List[Card]):
        self.cards = cards
        self.pattern_type = self._analyze_pattern()

    def _analyze_pattern(self) -> str:
        """
        分析牌型

        Returns:
            牌型类型：single（单牌）、pair（对子）、tractor（拖拉机）、combo（组合）
        """
        if len(self.cards) == 1:
            return "single"
        elif len(self.cards) == 2 and self.cards[0] == self.cards[1]:
            return "pair"
        elif self._is_tractor():
            return "tractor"
        else:
            return "combo"

    def _is_tractor(self) -> bool:
        """判断是否为拖拉机（连续的对子）"""
        if len(self.cards) < 4 or len(self.cards) % 2 != 0:
            return False

        # 统计每张牌的数量
        card_counts = Counter([str(card) for card in self.cards])

        # 所有牌必须成对
        if not all(count >= 2 for count in card_counts.values()):
            return False

        # 检查是否连续（这里简化处理，实际需要考虑主牌顺序）
        # TODO: 完善拖拉机检测逻辑
        return True

    def __len__(self):
        return len(self.cards)


class RuleEngine:
    """规则引擎"""

    def __init__(self, game_state: GameState):
        self.game_state = game_state

    def validate_play(self, player: Player, cards: List[Card]) -> Tuple[bool, str]:
        """
        验证出牌是否合法

        Args:
            player: 出牌玩家
            cards: 出的牌

        Returns:
            (是否合法, 错误信息)
        """
        if not cards:
            return False, "必须出牌"

        # 检查玩家是否拥有这些牌
        for card in cards:
            if not player.has_card(card):
                return False, f"玩家没有这张牌: {card}"

        # 如果是领牌玩家，验证出牌规则
        if player.player_id == self.game_state.lead_player:
            return self._validate_lead_play(cards)

        # 跟牌规则
        return self._validate_follow(player, cards)

    def _validate_lead_play(self, cards: List[Card]) -> Tuple[bool, str]:
        """
        验证领牌玩家出牌是否合法
        规则：必须出1张、2张或3张完全相同的牌（同花色同点数）
        
        Args:
            cards: 要出的牌
            
        Returns:
            (是否合法, 错误信息)
        """
        # 检查牌数量
        if len(cards) < 1 or len(cards) > 3:
            return False, "领牌玩家必须出1张、2张或3张牌"
        
        # 如果是单张，直接合法
        if len(cards) == 1:
            return True, ""
        
        # 如果是多张，必须是完全相同的牌（同花色同点数）
        first_card = cards[0]
        first_rank = first_card.rank
        first_suit = first_card.suit
        
        for card in cards[1:]:
            if card.rank != first_rank:
                return False, "领牌时多张牌必须是相同点数"
            if card.suit != first_suit:
                return False, "领牌时多张牌必须是相同花色"
        
        return True, ""

    def _validate_follow(self, player: Player, cards: List[Card]) -> Tuple[bool, str]:
        """
        验证跟牌是否合法
        根据升级/拖拉机规则：
        1. 必须跟相同数量的牌
        2. 优先跟首家花色
        3. 如果无该花色，可出任意其他牌
        4. 主牌时，可以打出任意主牌或活主

        Args:
            player: 跟牌玩家
            cards: 跟的牌

        Returns:
            (是否合法, 错误信息)
        """
        if not self.game_state.current_trick:
            return True, ""

        lead_player_id, lead_cards = self.game_state.current_trick[0]

        # 必须跟相同数量的牌
        if len(cards) != len(lead_cards):
            return False, f"必须出{len(lead_cards)}张牌"

        trump_suit = self.game_state.trump_suit
        trump_rank = self.game_state.trump_rank

        # 判断领牌的有效花色类型
        lead_effective_suit = self._get_effective_suit_type(lead_cards[0], trump_suit, trump_rank)
        
        # 获取玩家手中相同有效花色的牌
        same_suit_cards = []
        for card in player.hand:
            if self._get_effective_suit_type(card, trump_suit, trump_rank) == lead_effective_suit:
                same_suit_cards.append(card)

        # 如果有相同花色的牌，必须出相同花色
        if same_suit_cards:
            # 检查出的牌是否都是相同花色
            for card in cards:
                if self._get_effective_suit_type(card, trump_suit, trump_rank) != lead_effective_suit:
                    return False, f"必须跟{self._get_suit_name(lead_effective_suit)}"
            
            # 对于多张牌，还需要检查是否有足够的同花色牌来满足要求
            if len(same_suit_cards) < len(cards):
                return False, f"没有足够的{self._get_suit_name(lead_effective_suit)}牌"
        
        # 如果没有相同花色牌，可以出任意牌
        return True, ""

    def _get_effective_suit_type(self, card: Card, trump_suit: Optional[Suit], trump_rank: Rank) -> str:
        """
        获取牌的有效花色类型
        
        Args:
            card: 牌
            trump_suit: 主花色
            trump_rank: 主牌级别
            
        Returns:
            str: 有效花色类型
        """
        # 判断是否为主牌
        if card.is_trump(trump_suit, trump_rank):
            return "TRUMP"
        
        # 副牌按实际花色分类
        return card.suit.value

    def _get_suit_name(self, suit_type: str) -> str:
        """获取花色名称"""
        if suit_type == "TRUMP":
            return "主牌"
        elif suit_type == "♠":
            return "黑桃"
        elif suit_type == "♥":
            return "红桃"
        elif suit_type == "♣":
            return "梅花"
        elif suit_type == "♦":
            return "方块"
        else:
            return suit_type

    def determine_trick_winner(self) -> int:
        """
        判断当前轮的赢家

        Returns:
            赢家的玩家ID
        """
        if not self.game_state.is_trick_complete():
            return -1

        trump_suit = self.game_state.trump_suit
        trump_rank = self.game_state.trump_rank
        lead_player_id, lead_cards = self.game_state.current_trick[0]
        lead_suit = lead_cards[0].suit if lead_cards else None

        winner_id = lead_player_id
        max_power = max(card.get_power(trump_suit, trump_rank, lead_suit) for card in lead_cards)

        # 比较每个玩家的牌
        for player_id, cards in self.game_state.current_trick[1:]:
            for card in cards:
                power = card.get_power(trump_suit, trump_rank, lead_suit)
                if power > max_power:
                    max_power = power
                    winner_id = player_id

        return winner_id

    def can_declare_trump(self, player: Player, card: Card, trump_rank: Rank) -> bool:
        """
        判断是否可以亮主

        Args:
            player: 玩家
            card: 亮的牌
            trump_rank: 当前级别

        Returns:
            是否可以亮主
        """
        # 简化规则：级牌可以亮主
        if card.rank == trump_rank:
            return True

        # 大小王可以亮主
        if card.is_joker():
            return True

        return False

    def is_game_over(self) -> bool:
        """
        判断游戏是否结束（所有玩家都出完牌）

        Returns:
            是否结束
        """
        # 如果没有玩家或玩家数量不足，游戏未结束
        if not self.game_state.players or len(self.game_state.players) < 4:
            return False
            
        # 检查是否所有玩家都出完牌，并且至少有人有过牌
        players_with_no_cards = [p for p in self.game_state.players if p.get_hand_size() == 0]
        
        # 只有当所有玩家都有牌过并且现在都没牌时，游戏才结束
        if len(players_with_no_cards) == len(self.game_state.players):
            # 额外检查：确保游戏真的进行过（有过出牌记录）
            return len(self.game_state.trick_history) > 0
            
        return False
