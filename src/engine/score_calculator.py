"""
得分计算器
"""
from typing import List
from ..core import Card, Rank


class ScoreCalculator:
    """得分计算器"""

    @staticmethod
    def get_card_points(card: Card) -> int:
        """
        获取单张牌的分值

        Args:
            card: 牌

        Returns:
            分值（5, 10, K分别是5分，10分，10分）
        """
        if card.rank == Rank.FIVE:
            return 5
        elif card.rank == Rank.TEN or card.rank == Rank.KING:
            return 10
        else:
            return 0

    @classmethod
    def calculate_trick_points(cls, cards: List[Card]) -> int:
        """
        计算一轮牌的总分

        Args:
            cards: 这一轮所有玩家出的牌

        Returns:
            总分值
        """
        total = 0
        for card in cards:
            total += cls.get_card_points(card)
        return total

    @staticmethod
    def calculate_level_change(points: int, bottom_multiplier: int = 1) -> int:
        """
        根据分数计算升级数

        Args:
            points: 得分
            bottom_multiplier: 底牌倍数（被扣底时，底牌按倍数计算）

        Returns:
            升级数
        """
        # 升级规则（可根据实际规则调整）
        # 0分：升3级
        # 40分以下：升2级
        # 80分以下：升1级
        # 80-120分：守住不升不降
        # 120分以上：对方升1级

        adjusted_points = points * bottom_multiplier

        if adjusted_points < 40:
            return 3
        elif adjusted_points < 80:
            return 2
        elif adjusted_points < 120:
            return 1
        elif adjusted_points < 160:
            return 0
        else:
            return -1  # 对方升级

    @staticmethod
    def get_level_progression() -> List[Rank]:
        """
        获取级别进度顺序

        Returns:
            级别顺序列表
        """
        return [
            Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX,
            Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN,
            Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE
        ]

    @classmethod
    def advance_level(cls, current_level: Rank, levels_to_advance: int) -> Rank:
        """
        升级

        Args:
            current_level: 当前级别
            levels_to_advance: 要升的级数

        Returns:
            新的级别
        """
        progression = cls.get_level_progression()
        try:
            current_index = progression.index(current_level)
            new_index = min(current_index + levels_to_advance, len(progression) - 1)
            return progression[new_index]
        except ValueError:
            return current_level
