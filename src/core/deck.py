"""
牌堆管理
"""
import random
from typing import List
from .card import Card, Suit, Rank


class Deck:
    """牌堆类"""

    def __init__(self, num_decks: int = 3):
        """
        初始化牌堆

        Args:
            num_decks: 使用几副牌（升级游戏使用3副，共162张）
        """
        self.num_decks = num_decks
        self.cards: List[Card] = []
        self.reset()

    def reset(self):
        """重置牌堆（创建新牌堆）"""
        self.cards = []

        # 创建指定副数的扑克牌
        for _ in range(self.num_decks):
            # 添加四种花色的牌
            for suit in [Suit.SPADE, Suit.HEART, Suit.CLUB, Suit.DIAMOND]:
                for rank in [Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE,
                           Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE,
                           Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE]:
                    self.cards.append(Card(suit, rank))

            # 添加大小王
            self.cards.append(Card(Suit.JOKER, Rank.SMALL_JOKER))
            self.cards.append(Card(Suit.JOKER, Rank.BIG_JOKER))

    def shuffle(self):
        """洗牌"""
        random.shuffle(self.cards)

    def draw(self, count: int = 1) -> List[Card]:
        """
        抽牌

        Args:
            count: 抽牌数量

        Returns:
            抽取的牌列表
        """
        if count > len(self.cards):
            count = len(self.cards)

        drawn_cards = self.cards[:count]
        self.cards = self.cards[count:]
        return drawn_cards

    def remaining(self) -> int:
        """返回剩余牌数"""
        return len(self.cards)

    def is_empty(self) -> bool:
        """判断牌堆是否为空"""
        return len(self.cards) == 0

    def __len__(self):
        return len(self.cards)

    def __str__(self):
        return f"Deck({self.remaining()} cards remaining)"
