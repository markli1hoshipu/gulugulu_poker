#!/usr/bin/env python3
"""
测试发牌逻辑
"""
import sys
from pathlib import Path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from src.engine.card_manager import CardManager
from src.core import Player

def test_dealing():
    """测试发牌逻辑"""
    print("=== 测试升级/拖拉机发牌逻辑 ===")
    
    # 创建4个玩家
    players = [Player(i, f"Player_{i}") for i in range(4)]
    
    # 创建发牌管理器
    card_manager = CardManager()
    
    # 开始发牌
    total_cards = card_manager.start_incremental_deal(players)
    print(f"牌堆初始化完成，总牌数: {total_cards}")
    
    # 模拟增量发牌过程
    dealt_total = 0
    round_count = 0
    
    while True:
        round_count += 1
        cards_per_player = 3  # 每次发3张
        
        print(f"\n--- 第{round_count}轮发牌 ---")
        dealt_cards, is_complete, remaining = card_manager.deal_next_cards(players, cards_per_player)
        
        round_dealt = 0
        for player_id, cards in dealt_cards:
            cards_count = len(cards)
            round_dealt += cards_count
            print(f"玩家 {player_id}: 本轮获得 {cards_count} 张牌")
        
        dealt_total += round_dealt
        print(f"本轮总发牌: {round_dealt}张")
        print(f"累计发牌: {dealt_total}张")
        print(f"剩余牌数: {remaining}张")
        print(f"发牌是否完成: {is_complete}")
        
        if is_complete:
            break
    
    # 检查最终结果
    print(f"\n=== 发牌完成统计 ===")
    total_in_hands = 0
    for i, player in enumerate(players):
        hand_size = len(player.hand)
        total_in_hands += hand_size
        print(f"玩家 {i}: {hand_size} 张牌")
    
    bottom_cards = card_manager.get_bottom_cards()
    bottom_count = len(bottom_cards)
    
    print(f"底牌: {bottom_count} 张")
    print(f"手牌总数: {total_in_hands} 张")
    print(f"总计: {total_in_hands + bottom_count} 张")
    print(f"期望: 162 张 (3副牌)")
    
    # 验证
    expected_per_player = 39
    expected_bottom = 6
    expected_total = 162
    
    success = True
    
    if total_in_hands + bottom_count != expected_total:
        print(f"❌ 总牌数错误: 期望{expected_total}，实际{total_in_hands + bottom_count}")
        success = False
    
    if bottom_count != expected_bottom:
        print(f"❌ 底牌数错误: 期望{expected_bottom}，实际{bottom_count}")
        success = False
    
    for i, player in enumerate(players):
        if len(player.hand) != expected_per_player:
            print(f"❌ 玩家{i}手牌数错误: 期望{expected_per_player}，实际{len(player.hand)}")
            success = False
    
    if success:
        print("✅ 发牌逻辑验证通过！")
    else:
        print("❌ 发牌逻辑存在问题！")
    
    return success

if __name__ == "__main__":
    test_dealing()