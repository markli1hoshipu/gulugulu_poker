"""
基础测试用例
"""
# -*- coding: utf-8 -*-
import sys
import os
import io

# 设置标准输出为UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 添加src目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.core import Card, Suit, Rank, Player, Deck, GameState
from src.engine import CardManager, ScoreCalculator
from src.controller import GameController


def test_card_creation():
    """测试牌的创建"""
    print("测试牌的创建...")
    card = Card(Suit.SPADE, Rank.ACE)
    assert str(card) == "♠A", f"牌显示错误: {card}"
    print(f"  [OK] 创建牌: {card}")


def test_deck_creation():
    """测试牌堆创建"""
    print("\n测试牌堆创建...")
    deck = Deck(num_decks=2)
    assert len(deck) == 108, f"牌堆数量错误: {len(deck)}"
    print(f"  [OK] 牌堆创建成功，共 {len(deck)} 张牌")


def test_player_creation():
    """测试玩家创建"""
    print("\n测试玩家创建...")
    player = Player(0, "测试玩家")
    assert player.player_id == 0
    assert player.name == "测试玩家"
    assert player.team == 0
    print(f"  [OK] 玩家创建成功: {player}")


def test_deal_cards():
    """测试发牌"""
    print("\n测试发牌...")
    players = [Player(i, f"玩家{i}") for i in range(4)]
    manager = CardManager()

    bottom_cards = manager.deal_cards(players)

    # 验证每个玩家都有牌
    for player in players:
        assert player.get_hand_size() > 0, f"{player} 没有牌"
        print(f"  [OK] {player.name} 收到 {player.get_hand_size()} 张牌")

    print(f"  [OK] 底牌: {len(bottom_cards)} 张")


def test_score_calculation():
    """测试得分计算"""
    print("\n测试得分计算...")

    # 创建一些牌
    cards = [
        Card(Suit.SPADE, Rank.FIVE),   # 5分
        Card(Suit.HEART, Rank.TEN),    # 10分
        Card(Suit.CLUB, Rank.KING),    # 10分
        Card(Suit.DIAMOND, Rank.ACE),  # 0分
    ]

    score = ScoreCalculator.calculate_trick_points(cards)
    assert score == 25, f"得分计算错误: {score}"
    print(f"  [OK] 得分计算正确: {score}分")


def test_game_controller():
    """测试游戏控制器"""
    print("\n测试游戏控制器...")

    controller = GameController()
    player_names = ["玩家A", "玩家B", "玩家C", "玩家D"]

    # 初始化游戏
    controller.initialize_game(player_names)
    assert len(controller.game_state.players) == 4
    print(f"  [OK] 游戏初始化成功，4个玩家")

    # 开始一局
    controller.start_round(dealer_id=0)

    # 验证发牌
    for player in controller.game_state.players:
        assert player.get_hand_size() > 0
        print(f"  [OK] {player.name} 收到 {player.get_hand_size()} 张牌")


def run_all_tests():
    """运行所有测试"""
    print("="*60)
    print("开始运行测试...")
    print("="*60)

    try:
        test_card_creation()
        test_deck_creation()
        test_player_creation()
        test_deal_cards()
        test_score_calculation()
        test_game_controller()

        print("\n" + "="*60)
        print("[PASSED] 所有测试通过！")
        print("="*60 + "\n")

    except AssertionError as e:
        print(f"\n[FAILED] 测试失败: {e}")
        raise


if __name__ == "__main__":
    run_all_tests()
