"""
发牌管理器
"""
from typing import List
from ..core import Deck, Player, Card


class CardManager:
    """发牌管理器"""

    def __init__(self):
        self.deck = Deck(num_decks=3)  # 使用3副牌

    def deal_cards(self, players: List[Player], bottom_size: int = 6) -> List[Card]:
        """
        发牌给所有玩家（3副牌=162张，4人×39张+6张底牌）

        Args:
            players: 玩家列表（必须是4个玩家）
            bottom_size: 底牌数量（默认6张）

        Returns:
            底牌列表
        """
        if len(players) != 4:
            raise ValueError("必须有4个玩家")

        # 重置并洗牌
        self.deck.reset()
        self.deck.shuffle()

        # 计算每人应得的牌数
        total_cards = len(self.deck)
        cards_per_player = (total_cards - bottom_size) // 4

        # 发牌
        for player in players:
            player.clear_hand()
            cards = self.deck.draw(cards_per_player)
            player.add_cards(cards)

        # 底牌
        bottom_cards = self.deck.draw(bottom_size)

        return bottom_cards

    def start_incremental_deal(self, players: List[Player]) -> int:
        """
        开始增量发牌（用于亮主阶段）
        3副牌×54张=162张牌总数

        Args:
            players: 玩家列表

        Returns:
            总牌数
        """
        # 重置并洗牌
        self.deck.reset()
        self.deck.shuffle()

        # 清空玩家手牌
        for player in players:
            player.clear_hand()

        total_cards = len(self.deck)
        
        return total_cards

    def deal_next_cards(self, players: List[Player], cards_per_player: int = 1) -> tuple:
        """
        发下一批牌（增量发牌）
        确保3副牌162张：4人×39张=156张 + 6张底牌 = 162张

        Args:
            players: 玩家列表
            cards_per_player: 每个玩家发几张牌

        Returns:
            (所有玩家获得的牌列表, 是否发完, 剩余牌数)
            dealt_cards格式: [(player_id, [cards])]
        """
        dealt_cards = []
        
        # 确保我们有正确数量的牌
        if len(players) != 4:
            raise ValueError("必须有4个玩家")

        # 计算可发牌总数（保留6张底牌）
        available_total = self.deck.remaining() - 6
        if available_total < 0:
            available_total = 0
            
        # 计算每个玩家能发多少张牌
        if available_total >= len(players) * cards_per_player:
            # 足够每人发指定数量
            cards_per_player_actual = cards_per_player
        else:
            # 不够的话平均分配
            cards_per_player_actual = available_total // len(players)
        
        for player in players:
            if cards_per_player_actual > 0 and self.deck.remaining() > 6:
                cards = self.deck.draw(cards_per_player_actual)
                player.add_cards(cards)
                dealt_cards.append((player.player_id, cards))
            else:
                dealt_cards.append((player.player_id, []))

        # 检查是否发完（只剩6张底牌）
        remaining_after = self.deck.remaining()
        is_complete = remaining_after == 6

        return dealt_cards, is_complete, remaining_after

    def get_bottom_cards(self) -> List[Card]:
        """获取剩余的底牌"""
        return self.deck.draw(self.deck.remaining())
