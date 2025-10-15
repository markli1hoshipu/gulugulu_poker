"""
控制台UI
"""
from typing import List
from ..core import GameState, Player, Card, GamePhase
from ..controller import GameController


class ConsoleUI:
    """控制台用户界面"""

    def __init__(self, controller: GameController):
        """
        初始化UI

        Args:
            controller: 游戏控制器
        """
        self.controller = controller

        # 注册事件回调
        self.controller.on_state_change = self.on_state_change
        self.controller.on_cards_dealt = self.on_cards_dealt
        self.controller.on_trick_complete = self.on_trick_complete
        self.controller.on_round_end = self.on_round_end

    def display_banner(self):
        """显示游戏横幅"""
        print("\n" + "="*60)
        print(" "*20 + "升级扑克游戏")
        print("="*60 + "\n")

    def display_game_state(self, state: GameState):
        """
        显示游戏状态

        Args:
            state: 游戏状态
        """
        print(f"\n当前阶段: {state.phase.value}")
        print(f"当前轮数: {state.round_number}")

        if state.trump_suit:
            print(f"主花色: {state.trump_suit.value}")
        print(f"当前级别: {state.trump_rank.value}")

        if state.phase == GamePhase.PLAYING:
            current_player = state.get_player(state.current_player)
            if current_player:
                print(f"\n>>> 当前出牌玩家: {current_player.name} (玩家{current_player.player_id})")

    def display_all_hands(self, state: GameState):
        """
        显示所有玩家的手牌（可见）

        Args:
            state: 游戏状态
        """
        print("\n" + "-"*60)
        print("所有玩家手牌:")
        print("-"*60)

        for player in state.players:
            self.display_player_hand(player)

        print("-"*60)

    def display_player_hand(self, player: Player):
        """
        显示单个玩家的手牌

        Args:
            player: 玩家
        """
        team_name = "甲队" if player.team == 0 else "乙队"
        print(f"\n{player.name} (玩家{player.player_id}, {team_name}):")
        print(f"  手牌数: {player.get_hand_size()}")

        if player.hand:
            # 按10张一行显示
            cards_str = [str(card) for card in player.hand]
            for i in range(0, len(cards_str), 10):
                chunk = cards_str[i:i+10]
                print(f"  {' '.join(chunk)}")
        else:
            print("  (无牌)")

    def display_current_trick(self, state: GameState):
        """
        显示当前轮的出牌情况

        Args:
            state: 游戏状态
        """
        if not state.current_trick:
            return

        print("\n当前轮出牌:")
        for player_id, cards in state.current_trick:
            player = state.get_player(player_id)
            cards_str = ' '.join(str(card) for card in cards)
            player_name = player.name if player else f"玩家{player_id}"
            print(f"  {player_name}: {cards_str}")

    def display_scores(self, state: GameState):
        """
        显示得分情况

        Args:
            state: 游戏状态
        """
        print("\n当前得分:")
        print(f"  甲队 (玩家0, 玩家2): {state.collected_points[0]}分")
        print(f"  乙队 (玩家1, 玩家3): {state.collected_points[1]}分")

    def get_player_input(self, player: Player) -> List[Card]:
        """
        获取玩家输入（选择要出的牌）

        Args:
            player: 当前玩家

        Returns:
            选择的牌列表
        """
        print(f"\n{player.name} 的回合，请选择要出的牌:")

        # 显示玩家手牌（带索引）
        for i, card in enumerate(player.hand):
            print(f"  [{i}] {card}")

        while True:
            user_input = input("\n请输入牌的索引（多张牌用空格分隔，例如: 0 1 2）: ").strip()

            if not user_input:
                print("请至少选择一张牌")
                continue

            try:
                indices = [int(x) for x in user_input.split()]

                # 验证索引
                if any(i < 0 or i >= len(player.hand) for i in indices):
                    print("索引超出范围，请重新输入")
                    continue

                # 获取对应的牌
                selected_cards = [player.hand[i] for i in indices]
                return selected_cards

            except ValueError:
                print("输入格式错误，请输入数字索引")

    def run_game_loop(self):
        """运行游戏主循环"""
        self.display_banner()

        # 初始化游戏
        player_names = ["玩家A", "玩家B", "玩家C", "玩家D"]
        self.controller.initialize_game(player_names)

        # 开始一局
        self.controller.start_round(dealer_id=0)

        # 游戏循环
        state = self.controller.get_game_state()

        while state.phase == GamePhase.PLAYING:
            # 显示游戏状态
            self.display_game_state(state)
            self.display_all_hands(state)
            self.display_current_trick(state)
            self.display_scores(state)

            # 获取当前玩家
            current_player = self.controller.get_current_player()
            if not current_player:
                break

            # 获取玩家输入
            selected_cards = self.get_player_input(current_player)

            # 执行出牌
            success = self.controller.play_cards(current_player.player_id, selected_cards)

            if not success:
                print("\n出牌失败，请重试")
                continue

        # 游戏结束
        print("\n" + "="*60)
        print("本局游戏结束！")
        self.display_scores(state)
        print("="*60 + "\n")

    # 事件回调
    def on_state_change(self, state: GameState):
        """状态变化回调"""
        pass

    def on_cards_dealt(self, state: GameState):
        """发牌完成回调"""
        print("\n发牌完成！")

    def on_trick_complete(self, state: GameState):
        """一轮完成回调"""
        print("\n>>> 本轮结束！")

    def on_round_end(self, state: GameState):
        """一局结束回调"""
        print("\n>>> 一局游戏结束！")
