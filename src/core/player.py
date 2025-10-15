"""
玩家数据结构
"""
from typing import List
from .card import Card


class Player:
    """玩家类"""

    def __init__(self, player_id: int, name: str):
        """
        初始化玩家

        Args:
            player_id: 玩家ID (0-3)
            name: 玩家名称
        """
        self.player_id = player_id
        self.name = name
        self.hand: List[Card] = []  # 手牌
        self.team = player_id % 2  # 组队：0/2 一队，1/3 一队
        self.score = 0  # 本局得分

    def add_cards(self, cards: List[Card]):
        """添加手牌"""
        self.hand.extend(cards)

    def remove_cards(self, cards: List[Card]):
        """移除手牌"""
        for card in cards:
            if card in self.hand:
                self.hand.remove(card)

    def clear_hand(self):
        """清空手牌"""
        self.hand.clear()

    def has_card(self, card: Card) -> bool:
        """检查是否有某张牌"""
        return card in self.hand

    def get_hand_size(self) -> int:
        """获取手牌数量"""
        return len(self.hand)

    def sort_hand(self, trump_suit, trump_rank):
        """
        整理手牌（按牌力排序）

        Args:
            trump_suit: 主花色
            trump_rank: 主牌级别
        """
        self.hand.sort(key=lambda card: card.get_power(trump_suit, trump_rank), reverse=True)

    def __str__(self):
        return f"Player {self.player_id} ({self.name})"

    def __repr__(self):
        return self.__str__()
