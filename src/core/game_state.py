"""
游戏状态管理
"""
from enum import Enum
from typing import List, Optional, Dict
from .card import Card, Suit, Rank
from .player import Player


class GamePhase(Enum):
    """游戏阶段枚举"""
    WAITING = "waiting"  # 等待开始
    DEALING = "dealing"  # 发牌阶段（逐张发牌并允许亮主）
    TRIBUTE = "tribute"  # 上贡/喝血阶段
    BOTTOM_REVEAL = "bottom_reveal"  # 底牌展示阶段
    BOTTOM_BURY = "bottom_bury"  # 庄家埋底阶段
    KING_BURY = "king_bury"  # 其他玩家扣王阶段
    PLAYING = "playing"  # 出牌阶段
    ROUND_END = "round_end"  # 本轮结束
    GAME_END = "game_end"  # 游戏结束


class GameState:
    """游戏状态类"""

    def __init__(self):
        """初始化游戏状态"""
        # 基本状态
        self.phase = GamePhase.WAITING
        self.players: List[Player] = []

        # 主牌信息
        self.trump_suit: Optional[Suit] = None  # 主花色
        self.trump_rank: Rank = Rank.THREE  # 当前打的级别（从3开始）
        self.trump_declarer: Optional[int] = None  # 亮主的玩家ID
        self.dealer_id: int = 0  # 庄家ID
        self.trump_bid_level: int = 0  # 当前亮主级别（1张级牌=1，2张=2，3张=3，3大王=4，3小王=3.5）
        self.trump_locked: bool = False  # 主花色是否已锁定

        # 底牌
        self.bottom_cards: List[Card] = []  # 底牌（6张）
        self.buried_jokers: List[Card] = []  # 底牌中扣的王
        self.bottom_captured_by: Optional[int] = None  # 底牌被哪队获得（None表示庄家保底）

        # 当前轮次
        self.current_trick: List[tuple] = []  # 当前一轮的出牌 [(player_id, cards)]
        self.current_player: int = 0  # 当前出牌玩家
        self.lead_player: int = 0  # 本轮领牌玩家
        self.lead_suit: Optional[Suit] = None  # 本轮领牌花色

        # 得分和等级
        self.team_scores: Dict[int, int] = {0: 0, 1: 0}  # 两队总得分
        self.team_levels: Dict[int, int] = {0: 3, 1: 3}  # 两队当前级别（3-10）

        # 上贡信息
        self.tribute_count: int = 0  # 本局需要上贡的牌数
        self.tribute_direction: str = "to_dealer"  # "to_dealer" 或 "from_dealer"（暴动时）
        self.tribute_completed: bool = False

        # 本局收集的分数牌
        self.collected_points: Dict[int, int] = {0: 0, 1: 0}

        # 历史记录
        self.trick_history: List[List[tuple]] = []  # 每轮出牌历史
        self.round_number: int = 0  # 轮数

    def add_player(self, player: Player):
        """添加玩家"""
        if len(self.players) < 4:
            self.players.append(player)

    def get_player(self, player_id: int) -> Optional[Player]:
        """获取玩家"""
        for player in self.players:
            if player.player_id == player_id:
                return player
        return None

    def get_team_players(self, team: int) -> List[Player]:
        """获取队伍的所有玩家"""
        return [p for p in self.players if p.team == team]

    def next_player(self):
        """切换到下一个玩家"""
        self.current_player = (self.current_player + 1) % 4

    def set_phase(self, phase: GamePhase):
        """设置游戏阶段"""
        self.phase = phase

    def add_to_trick(self, player_id: int, cards: List[Card]):
        """添加当前轮的出牌"""
        self.current_trick.append((player_id, cards))

    def clear_trick(self):
        """清空当前轮出牌"""
        if self.current_trick:
            self.trick_history.append(self.current_trick.copy())
        self.current_trick.clear()
        self.lead_suit = None
        self.round_number += 1

    def is_trick_complete(self) -> bool:
        """判断当前轮是否完成（4个玩家都出牌了）"""
        return len(self.current_trick) == 4

    def all_players_ready(self) -> bool:
        """判断是否4个玩家都准备好了"""
        return len(self.players) == 4

    def reset_round(self):
        """重置本局游戏"""
        self.phase = GamePhase.DEALING
        self.current_trick.clear()
        self.trick_history.clear()
        self.bottom_cards.clear()
        self.trump_suit = None
        self.trump_declarer = None
        self.collected_points = {0: 0, 1: 0}
        self.round_number = 0

        # 清空所有玩家手牌
        for player in self.players:
            player.clear_hand()
            player.score = 0

    def __str__(self):
        return f"GameState(phase={self.phase.value}, players={len(self.players)}, round={self.round_number})"
