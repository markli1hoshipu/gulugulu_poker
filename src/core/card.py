"""
扑克牌核心数据结构
"""
from enum import Enum
from typing import Optional


class Suit(Enum):
    """花色枚举"""
    SPADE = "♠"    # 黑桃
    HEART = "♥"    # 红桃
    CLUB = "♣"     # 梅花
    DIAMOND = "♦"  # 方块
    JOKER = "JOKER"  # 大小王


class Rank(Enum):
    """牌面值枚举"""
    TWO = "2"
    THREE = "3"
    FOUR = "4"
    FIVE = "5"
    SIX = "6"
    SEVEN = "7"
    EIGHT = "8"
    NINE = "9"
    TEN = "10"
    JACK = "J"
    QUEEN = "Q"
    KING = "K"
    ACE = "A"
    SMALL_JOKER = "小王"
    BIG_JOKER = "大王"


class Card:
    """扑克牌类"""

    def __init__(self, suit: Suit, rank: Rank):
        self.suit = suit
        self.rank = rank

    def __str__(self):
        if self.suit == Suit.JOKER:
            return self.rank.value
        return f"{self.suit.value}{self.rank.value}"

    def __repr__(self):
        return self.__str__()

    def __eq__(self, other):
        if not isinstance(other, Card):
            return False
        return self.suit == other.suit and self.rank == other.rank

    def __hash__(self):
        return hash((self.suit, self.rank))

    def is_joker(self) -> bool:
        """判断是否为大小王"""
        return self.suit == Suit.JOKER

    def is_active_trump(self, trump_rank: Rank) -> bool:
        """
        判断是否为活主牌（大小王、2、级牌）

        Args:
            trump_rank: 当前级别

        Returns:
            是否为活主牌
        """
        # 大小王永远是活主牌
        if self.is_joker():
            return True

        # 所有2都是活主牌
        if self.rank == Rank.TWO:
            return True

        # 与级别相同的牌是活主牌
        if self.rank == trump_rank:
            return True

        return False

    def is_trump(self, trump_suit: Optional[Suit], trump_rank: Rank) -> bool:
        """
        判断是否为主牌

        Args:
            trump_suit: 主花色
            trump_rank: 主牌级别（当前打的级别）

        Returns:
            是否为主牌
        """
        # 活主牌永远是主牌
        if self.is_active_trump(trump_rank):
            return True

        # 主花色的牌是主牌
        if trump_suit and self.suit == trump_suit:
            return True

        return False

    def get_power(self, trump_suit: Optional[Suit], trump_rank: Rank, lead_suit: Optional[Suit] = None) -> int:
        """
        获取牌的大小（用于比较）
        按照规则：大王>小王>主花色级牌>其他花色级牌>主花色2>其他花色2>其他主牌>领牌花色>其他副牌

        Args:
            trump_suit: 主花色
            trump_rank: 主牌级别
            lead_suit: 本轮领牌花色

        Returns:
            牌力值（越大越大）
        """
        # 基础牌力值
        rank_values = {
            Rank.TWO: 2, Rank.THREE: 3, Rank.FOUR: 4, Rank.FIVE: 5,
            Rank.SIX: 6, Rank.SEVEN: 7, Rank.EIGHT: 8, Rank.NINE: 9,
            Rank.TEN: 10, Rank.JACK: 11, Rank.QUEEN: 12, Rank.KING: 13,
            Rank.ACE: 14
        }

        # 花色优先级（用于同级别排序）
        suit_values = {
            Suit.SPADE: 4, Suit.HEART: 3, Suit.DIAMOND: 2, Suit.CLUB: 1
        }

        # 1. 大王最大
        if self.rank == Rank.BIG_JOKER:
            return 1000

        # 2. 小王
        if self.rank == Rank.SMALL_JOKER:
            return 999

        # 3. 主花色的级牌
        if self.rank == trump_rank and trump_suit and self.suit == trump_suit:
            return 950

        # 4. 其他花色的级牌（按花色优先级区分）
        if self.rank == trump_rank:
            return 900 + suit_values.get(self.suit, 0)

        # 5. 主花色的2
        if self.rank == Rank.TWO and trump_suit and self.suit == trump_suit:
            return 880

        # 6. 其他花色的2（按花色优先级区分）
        if self.rank == Rank.TWO:
            return 850 + suit_values.get(self.suit, 0)

        # 7. 其他主花色牌（按牌面大小）
        if trump_suit and self.suit == trump_suit:
            return 700 + rank_values.get(self.rank, 0)

        # 8. 领牌花色（副牌）
        if lead_suit and self.suit == lead_suit:
            return 100 + rank_values.get(self.rank, 0)

        # 9. 其他副牌
        return rank_values.get(self.rank, 0)
