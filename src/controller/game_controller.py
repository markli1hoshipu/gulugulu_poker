"""
游戏控制器
"""
from typing import List, Optional, Callable
from ..core import Player, GameState, GamePhase, Card, Suit, Rank
from ..engine import CardManager, ScoreCalculator, RuleEngine, TrumpManager


class GameController:
    """游戏控制器 - 管理整个游戏流程"""

    def __init__(self):
        """初始化游戏控制器"""
        self.game_state = GameState()
        self.card_manager = CardManager()
        self.score_calculator = ScoreCalculator()
        self.rule_engine = RuleEngine(self.game_state)
        self.trump_manager = TrumpManager(self.game_state)

        # Game round tracking
        self.total_rounds_played = 0  # Track total rounds across the game

        # 事件回调（用于UI更新）
        self.on_state_change: Optional[Callable] = None
        self.on_cards_dealt: Optional[Callable] = None
        self.on_trick_complete: Optional[Callable] = None
        self.on_round_end: Optional[Callable] = None

    def initialize_game(self, player_names: List[str]):
        """
        初始化游戏

        Args:
            player_names: 玩家名称列表（4个玩家）
        """
        if len(player_names) != 4:
            raise ValueError("必须有4个玩家")

        # 创建玩家
        self.game_state.players.clear()
        for i, name in enumerate(player_names):
            player = Player(player_id=i, name=name)
            self.game_state.add_player(player)

        self.game_state.set_phase(GamePhase.WAITING)
        self._notify_state_change()

    def start_round(self, dealer_id: int = 0):
        """
        开始新一轮游戏 - 使用增量发牌和亮主系统

        Args:
            dealer_id: 庄家ID（如果有上一轮的庄家）
        """
        if not self.game_state.all_players_ready():
            raise ValueError("玩家未准备好")

        # 重置游戏状态
        self.game_state.reset_round()
        self.game_state.dealer_id = dealer_id
        self.game_state.set_phase(GamePhase.DEALING)

        # Reset trump manager for new round
        is_first_game = (self.total_rounds_played == 0)
        self.trump_manager.reset_for_new_round(is_first_game)

        # 开始增量发牌
        self.card_manager.start_incremental_deal(self.game_state.players)

        self._notify_state_change()

    def deal_next_batch(self, cards_per_player: int = 3) -> dict:
        """
        发下一批牌

        Args:
            cards_per_player: 每个玩家发几张

        Returns:
            发牌结果
        """
        dealt_cards, is_complete, remaining = self.card_manager.deal_next_cards(
            self.game_state.players, cards_per_player
        )

        # 如果发牌完成，取出底牌
        if is_complete:
            self.game_state.bottom_cards = self.card_manager.get_bottom_cards()

        return {
            'dealt_cards': [
                {
                    'player_id': pid,
                    'cards': [{'suit': c.suit.value, 'rank': c.rank.value} for c in cards]
                }
                for pid, cards in dealt_cards
            ],
            'is_complete': is_complete,
            'remaining': remaining
        }

    def declare_trump(self, player_id: int, card_indices: List[int],
                     declared_suit: Optional[Suit] = None) -> tuple:
        """
        玩家亮主

        Args:
            player_id: 玩家ID
            card_indices: 要展示的牌的索引（在手牌中）
            declared_suit: 声明的主花色（用王亮主时必须）

        Returns:
            (是否成功, 消息)
        """
        player = self.game_state.get_player(player_id)
        if not player:
            return False, "玩家不存在"

        if self.game_state.phase != GamePhase.DEALING:
            return False, "只能在发牌阶段亮主"

        # 获取要展示的牌
        try:
            cards = [player.hand[i] for i in card_indices]
        except IndexError:
            return False, "卡牌索引无效"

        # 使用 TrumpManager 验证和声明
        success, message = self.trump_manager.declare_trump(player, cards, declared_suit)

        if success:
            # 整理所有玩家手牌
            for p in self.game_state.players:
                p.sort_hand(self.game_state.trump_suit, self.game_state.trump_rank)

            self._notify_state_change()

        return success, message

    def complete_dealing(self):
        """
        完成发牌阶段，进入出牌阶段
        """
        if self.game_state.phase != GamePhase.DEALING:
            return

        # 如果没有人亮主，从底牌翻牌定主
        if not self.game_state.trump_suit:
            self._determine_trump_from_bottom()

        # 确定庄家
        if self.game_state.trump_declarer is not None:
            self.game_state.dealer_id = self.game_state.trump_declarer

        # 整理手牌
        for player in self.game_state.players:
            player.sort_hand(self.game_state.trump_suit, self.game_state.trump_rank)

        # TODO: 实现上贡/喝血阶段
        # TODO: 实现埋底阶段

        # 进入出牌阶段
        self.game_state.set_phase(GamePhase.PLAYING)
        self.game_state.current_player = self.game_state.dealer_id
        self.game_state.lead_player = self.game_state.dealer_id

        self._notify_state_change()

    def _determine_trump_from_bottom(self):
        """从底牌翻牌定主"""
        if not self.game_state.bottom_cards:
            # 如果没有底牌，使用默认主花色
            self.game_state.trump_suit = Suit.SPADE
            self.game_state.dealer_id = 0
            return

        # 找底牌中最大的牌
        trump_rank = self.game_state.trump_rank
        max_card = None
        max_power = -1

        for card in self.game_state.bottom_cards:
            # 暂时使用简化规则：找第一张非王的牌作为主花色
            if card.suit != Suit.JOKER:
                self.game_state.trump_suit = card.suit
                break

        if not self.game_state.trump_suit:
            # 如果底牌全是王，使用默认
            self.game_state.trump_suit = Suit.SPADE

    def play_cards(self, player_id: int, cards: List[Card]) -> bool:
        """
        玩家出牌

        Args:
            player_id: 玩家ID
            cards: 出的牌

        Returns:
            是否成功
        """
        if self.game_state.phase != GamePhase.PLAYING:
            print("当前不是出牌阶段")
            return False

        if player_id != self.game_state.current_player:
            print(f"当前不是玩家 {player_id} 的回合")
            return False

        player = self.game_state.get_player(player_id)
        if not player:
            return False

        # 验证出牌是否合法
        valid, error_msg = self.rule_engine.validate_play(player, cards)
        if not valid:
            print(f"出牌不合法: {error_msg}")
            return False

        # 执行出牌
        player.remove_cards(cards)
        self.game_state.add_to_trick(player_id, cards)

        # 如果是领牌，设置领牌花色
        if player_id == self.game_state.lead_player and cards:
            self.game_state.lead_suit = cards[0].suit

        # 检查是否一轮结束
        if self.game_state.is_trick_complete():
            self._handle_trick_complete()
        else:
            # 切换到下一个玩家
            self.game_state.next_player()

        self._notify_state_change()
        return True

    def _handle_trick_complete(self):
        """处理一轮出牌完成"""
        # 判断赢家
        winner_id = self.rule_engine.determine_trick_winner()
        winner = self.game_state.get_player(winner_id)

        # 计算得分
        all_cards = []
        for _, cards in self.game_state.current_trick:
            all_cards.extend(cards)

        points = self.score_calculator.calculate_trick_points(all_cards)

        # 赢家所在队伍得分
        if winner:
            team = winner.team
            self.game_state.collected_points[team] += points

        # 清空本轮
        self.game_state.clear_trick()

        # 赢家成为下一轮的领牌玩家
        self.game_state.lead_player = winner_id
        self.game_state.current_player = winner_id

        self._notify_trick_complete()

        # 检查游戏是否结束
        if self.rule_engine.is_game_over():
            self._handle_round_end()

    def _handle_round_end(self):
        """处理一局游戏结束"""
        self.game_state.set_phase(GamePhase.ROUND_END)

        # 计算最终得分
        # TODO: 考虑底牌和扣底逻辑
        defending_team = 1 - (self.game_state.trump_declarer % 2) if self.game_state.trump_declarer is not None else 0

        defending_points = self.game_state.collected_points[defending_team]

        # 计算升级
        level_change = self.score_calculator.calculate_level_change(defending_points)

        self._notify_round_end()
        self._notify_state_change()

    def get_current_player(self) -> Optional[Player]:
        """获取当前出牌玩家"""
        return self.game_state.get_player(self.game_state.current_player)

    def get_valid_cards(self, player_id: int) -> List[Card]:
        """
        获取玩家可以出的牌

        Args:
            player_id: 玩家ID

        Returns:
            可出的牌列表
        """
        player = self.game_state.get_player(player_id)
        if not player:
            return []

        # 简化实现：返回所有手牌
        # TODO: 实现更精确的合法牌判断
        return player.hand.copy()

    # 事件通知方法
    def _notify_state_change(self):
        """通知状态变化"""
        if self.on_state_change:
            self.on_state_change(self.game_state)

    def _notify_cards_dealt(self):
        """通知发牌完成"""
        if self.on_cards_dealt:
            self.on_cards_dealt(self.game_state)

    def _notify_trick_complete(self):
        """通知一轮完成"""
        if self.on_trick_complete:
            self.on_trick_complete(self.game_state)

    def _notify_round_end(self):
        """通知一局结束"""
        if self.on_round_end:
            self.on_round_end(self.game_state)

    def get_game_state(self) -> GameState:
        """获取游戏状态（只读）"""
        return self.game_state
