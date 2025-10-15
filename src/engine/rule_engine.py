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

        # 如果是领牌玩家，可以随意出牌
        if player.player_id == self.game_state.lead_player:
            return True, ""

        # 跟牌规则
        return self._validate_follow(player, cards)

    def _validate_follow(self, player: Player, cards: List[Card]) -> Tuple[bool, str]:
        """
        验证跟牌是否合法

        Args:
            player: 跟牌玩家
            cards: 跟的牌

        Returns:
            (是否合法, 错误信息)
        """
        if not self.game_state.current_trick:
            return True, ""

        lead_player_id, lead_cards = self.game_state.current_trick[0]
        lead_pattern = CardPattern(lead_cards)

        # 必须跟相同数量的牌
        if len(cards) != len(lead_cards):
            return False, f"必须出{len(lead_cards)}张牌"

        # 必须跟相同花色（如果有）
        trump_suit = self.game_state.trump_suit
        trump_rank = self.game_state.trump_rank

        # 判断领牌是主牌还是副牌
        lead_is_trump = any(card.is_trump(trump_suit, trump_rank) for card in lead_cards)

        # 获取玩家手中的相同类型牌
        if lead_is_trump:
            same_type_cards = [c for c in player.hand if c.is_trump(trump_suit, trump_rank)]
        else:
            lead_suit = lead_cards[0].suit
            same_type_cards = [c for c in player.hand
                             if c.suit == lead_suit and not c.is_trump(trump_suit, trump_rank)]

        # 如果有相同类型的牌，必须出
        if same_type_cards:
            # 简化规则：只要有相同类型的牌即可（实际需要检查牌型匹配）
            has_same_type = any(card in same_type_cards for card in cards)
            if not has_same_type:
                return False, "必须跟相同花色/类型的牌"

        return True, ""

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
        return all(player.get_hand_size() == 0 for player in self.game_state.players)
