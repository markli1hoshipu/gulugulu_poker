"""
Game Manager - Manages game state and player sessions
"""
import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import logging
import asyncio
from typing import Dict, List, Optional
from src.controller import GameController
from src.core import GamePhase, Card
from ai_player import AIPlayerManager

logger = logging.getLogger(__name__)


class GameManager:
    """Manages game sessions and player connections"""

    def __init__(self):
        self.controller = GameController()
        self.players: Dict[str, int] = {}  # sid -> player_id mapping
        self.player_names: Dict[str, str] = {}  # sid -> player_name mapping
        self.game_started = False
        self.ai_manager = AIPlayerManager()
        self.game_loop_task = None  # AI游戏循环任务

    def add_player(self, sid: str, name: str) -> dict:
        """Add a player to the game"""
        if len(self.players) >= 4:
            return {
                'success': False,
                'message': '游戏已满（4/4玩家）'
            }

        if sid in self.players:
            return {
                'success': False,
                'message': '你已经在游戏中'
            }

        # Assign player ID
        player_id = len(self.players)
        self.players[sid] = player_id
        self.player_names[sid] = name

        logger.info(f"Player {name} (sid: {sid}) assigned player_id: {player_id}")

        return {
            'success': True,
            'player_id': player_id,
            'player_name': name,
            'message': f'成功加入游戏，你是玩家 {player_id}'
        }

    def add_ai_player(self) -> dict:
        """添加AI玩家"""
        if len(self.players) >= 4:
            return {
                'success': False,
                'message': '游戏已满（4/4玩家）'
            }

        # 找到下一个可用的player_id（确保不会覆盖现有玩家）
        existing_player_ids = set(self.players.values())
        player_id = 0
        while player_id in existing_player_ids:
            player_id += 1
            
        ai_sid = f"ai_player_{player_id}_{len([sid for sid in self.players if sid.startswith('ai_player_')])}"
        
        # 创建AI玩家
        ai_player = self.ai_manager.create_ai_player(player_id)
        
        # 添加到玩家列表
        self.players[ai_sid] = player_id
        self.player_names[ai_sid] = ai_player.name

        logger.info(f"AI玩家 {ai_player.name} 加入游戏 (player_id: {player_id}, sid: {ai_sid})")

        return {
            'success': True,
            'player_id': player_id,
            'player_name': ai_player.name,
            'message': f'AI玩家 {ai_player.name} 加入游戏'
        }

    def remove_player(self, sid: str):
        """Remove a player from the game"""
        if sid in self.players:
            player_id = self.players[sid]
            name = self.player_names.get(sid, 'Unknown')
            
            # 如果是AI玩家，也要从AI管理器中移除
            if sid.startswith('ai_player_'):
                self.ai_manager.remove_ai_player(player_id)
                
            del self.players[sid]
            del self.player_names[sid]
            logger.info(f"Player {name} (id: {player_id}) removed")

            # Reset game if a human player leaves (not AI)
            if self.game_started and not sid.startswith('ai_player_'):
                self.reset_game()

    def can_start_game(self) -> bool:
        """Check if game can start (4 players)"""
        return len(self.players) == 4 and not self.game_started

    def start_game(self) -> dict:
        """Start the game"""
        if not self.can_start_game():
            return {
                'success': False,
                'message': '需要4个玩家才能开始游戏'
            }

        # Initialize game with player names
        player_names_list = [self.player_names[sid] for sid in sorted(self.players.keys(), key=lambda s: self.players[s])]

        try:
            self.controller.initialize_game(player_names_list)
            self.controller.start_round(dealer_id=0)
            self.game_started = True

            logger.info(f"Game started with players: {player_names_list}, now in DEALING phase")

            # 自动发完所有牌 - 3副牌162张，4人每人39张，剩余6张底牌
            import os
            cards_per_player_target = int(os.environ.get('CARDS_PER_PLAYER', 39))  # 正确的应该是39张每人
            total_cards_per_player = 0
            
            logger.info(f"开始发牌：总共162张牌，4人每人{cards_per_player_target}张，剩余6张底牌")
            
            while total_cards_per_player < cards_per_player_target:
                cards_to_deal = min(3, cards_per_player_target - total_cards_per_player)  # 每次发3张，最后可能少于3张
                deal_result = self.controller.deal_next_batch(cards_to_deal)
                total_cards_per_player += cards_to_deal
                logger.info(f"发牌批次：每人{cards_to_deal}张，累计每人{total_cards_per_player}张")
                
                if deal_result.get('is_complete'):
                    logger.info(f"发牌完成，每人最终获得牌数: {total_cards_per_player}张")
                    break
            
            # 完成发牌阶段
            self.controller.complete_dealing()
            logger.info("All cards dealt, game ready to play")

            return {
                'success': True,
                'message': '发牌完成，游戏开始！'
            }
        except Exception as e:
            logger.error(f"Error starting game: {e}")
            return {
                'success': False,
                'message': f'启动游戏失败: {str(e)}'
            }

    def deal_next_batch(self, cards_per_player: int = 3) -> dict:
        """Deal next batch of cards"""
        if not self.game_started:
            return {
                'success': False,
                'message': '游戏未开始'
            }

        try:
            result = self.controller.deal_next_batch(cards_per_player)
            return {
                'success': True,
                **result
            }
        except Exception as e:
            logger.error(f"Error dealing cards: {e}")
            return {
                'success': False,
                'message': f'发牌失败: {str(e)}'
            }

    def declare_trump(self, sid: str, card_indices: List[int], declared_suit: Optional[str] = None) -> dict:
        """Handle trump declaration"""
        if sid not in self.players:
            return {
                'success': False,
                'message': '你不在游戏中'
            }

        if not self.game_started:
            return {
                'success': False,
                'message': '游戏未开始'
            }

        player_id = self.players[sid]

        # Convert suit string to Suit enum if provided
        from src.core import Suit
        suit_enum = None
        if declared_suit:
            suit_map = {
                '♠': Suit.SPADE, 'SPADE': Suit.SPADE,
                '♥': Suit.HEART, 'HEART': Suit.HEART,
                '♣': Suit.CLUB, 'CLUB': Suit.CLUB,
                '♦': Suit.DIAMOND, 'DIAMOND': Suit.DIAMOND
            }
            suit_enum = suit_map.get(declared_suit)

        try:
            success, message = self.controller.declare_trump(player_id, card_indices, suit_enum)

            if success:
                logger.info(f"Player {player_id} declared trump: {message}")

            return {
                'success': success,
                'message': message
            }
        except Exception as e:
            logger.error(f"Error declaring trump: {e}")
            return {
                'success': False,
                'message': f'亮主失败: {str(e)}'
            }

    def complete_dealing(self) -> dict:
        """Complete dealing phase and move to playing phase"""
        if not self.game_started:
            return {
                'success': False,
                'message': '游戏未开始'
            }

        try:
            self.controller.complete_dealing()
            logger.info("Dealing phase completed, moving to playing phase")

            return {
                'success': True,
                'message': '发牌完成，开始游戏！'
            }
        except Exception as e:
            logger.error(f"Error completing dealing: {e}")
            return {
                'success': False,
                'message': f'完成发牌失败: {str(e)}'
            }

    def play_cards(self, sid: str, card_indices: List[int]) -> dict:
        """Handle player playing cards"""
        if sid not in self.players:
            return {
                'success': False,
                'message': '你不在游戏中'
            }

        if not self.game_started:
            return {
                'success': False,
                'message': '游戏未开始'
            }

        player_id = self.players[sid]
        game_state = self.controller.get_game_state()

        # Check if it's this player's turn
        if game_state.current_player != player_id:
            return {
                'success': False,
                'message': f'还不是你的回合（当前玩家：{game_state.current_player}）'
            }

        # Get player and selected cards
        player = game_state.get_player(player_id)
        if not player:
            return {'success': False, 'message': '玩家不存在'}

        # Validate indices
        if not card_indices:
            return {'success': False, 'message': '请至少选择一张牌'}

        if any(i < 0 or i >= len(player.hand) for i in card_indices):
            return {'success': False, 'message': '卡牌索引无效'}

        # Get selected cards
        selected_cards = [player.hand[i] for i in card_indices]

        # Try to play cards
        success = self.controller.play_cards(player_id, selected_cards)

        if success:
            # Check game status
            game_state = self.controller.get_game_state()
            is_round_end = game_state.phase == GamePhase.ROUND_END
            is_game_over = self.controller.rule_engine.is_game_over()

            return {
                'success': True,
                'message': '出牌成功',
                'round_end': is_round_end,
                'game_end': is_game_over
            }
        else:
            # Get the actual error message from rule engine
            game_state = self.controller.get_game_state()
            player = game_state.get_player(player_id)
            validation_result = self.controller.rule_engine.validate_play(player, selected_cards)
            error_msg = validation_result[1] if len(validation_result) > 1 else '出牌不合法'
            
            return {
                'success': False,
                'message': error_msg
            }

    async def ai_auto_play(self) -> dict:
        """AI自动出牌"""
        game_state = self.controller.get_game_state()
        current_player_id = game_state.current_player
        
        # 检查当前玩家是否为AI
        if not self.ai_manager.is_ai_player(current_player_id):
            return {'success': False, 'message': '当前玩家不是AI'}
            
        ai_player = self.ai_manager.get_ai_player(current_player_id)
        if not ai_player:
            return {'success': False, 'message': 'AI玩家不存在'}
            
        try:
            # AI选择牌
            card_indices = ai_player.choose_cards_to_play(game_state, self.controller.rule_engine)
            
            if not card_indices:
                logger.warning(f"AI {ai_player.name} 没有选择任何牌")
                return {'success': False, 'message': 'AI没有选择牌'}
                
            # 获取选中的牌
            player = game_state.get_player(current_player_id)
            if not player:
                return {'success': False, 'message': '玩家不存在'}
                
            # 验证索引
            if any(i < 0 or i >= len(player.hand) for i in card_indices):
                logger.error(f"AI {ai_player.name} 选择了无效的牌索引: {card_indices}")
                return {'success': False, 'message': 'AI选择了无效的牌'}
                
            selected_cards = [player.hand[i] for i in card_indices]
            
            # 执行出牌
            success = self.controller.play_cards(current_player_id, selected_cards)
            
            if success:
                logger.info(f"AI {ai_player.name} 成功出牌: {[str(card) for card in selected_cards]}")
                
                # 检查游戏状态
                updated_game_state = self.controller.get_game_state()
                is_round_end = updated_game_state.phase == GamePhase.ROUND_END
                is_game_over = self.controller.rule_engine.is_game_over()
                
                return {
                    'success': True,
                    'message': f'AI {ai_player.name} 出牌成功',
                    'cards_played': [{'suit': card.suit.value, 'rank': card.rank.value} for card in selected_cards],
                    'round_end': is_round_end,
                    'game_end': is_game_over
                }
            else:
                logger.warning(f"AI {ai_player.name} 出牌失败")
                return {'success': False, 'message': 'AI出牌不合法'}
                
        except Exception as e:
            logger.error(f"AI自动出牌错误: {e}")
            return {'success': False, 'message': f'AI出牌错误: {str(e)}'}

    def get_game_state_for_all(self) -> dict:
        """Get game state for all players"""
        if not self.game_started:
            return {
                'started': False,
                'players_joined': len(self.players),
                'players_needed': 4 - len(self.players),
                'player_list': [
                    {'id': pid, 'name': self.player_names[sid]}
                    for sid, pid in sorted(self.players.items(), key=lambda x: x[1])
                ]
            }

        game_state = self.controller.get_game_state()

        # Build player hands (all visible for now)
        players_data = []
        for player in game_state.players:
            players_data.append({
                'id': player.player_id,
                'name': player.name,
                'team': player.team,
                'hand_size': player.get_hand_size(),
                'hand': [{'suit': card.suit.value, 'rank': card.rank.value} for card in player.hand],
                'score': player.score
            })

        # Current trick
        current_trick = []
        for player_id, cards in game_state.current_trick:
            current_trick.append({
                'player_id': player_id,
                'cards': [{'suit': card.suit.value, 'rank': card.rank.value} for card in cards]
            })

        # Format scoring cards for display
        scoring_cards_data = {
            0: [{'suit': card.suit.value if card.suit else '', 'rank': card.rank.value if card.rank else str(card)} 
                for card in game_state.scoring_cards[0]],
            1: [{'suit': card.suit.value if card.suit else '', 'rank': card.rank.value if card.rank else str(card)} 
                for card in game_state.scoring_cards[1]]
        }

        # Format bottom cards for display
        bottom_cards_data = []
        if game_state.bottom_cards:
            bottom_cards_data = [{'suit': card.suit.value if card.suit else '', 'rank': card.rank.value if card.rank else str(card)} 
                               for card in game_state.bottom_cards]

        return {
            'started': True,
            'phase': game_state.phase.value,
            'round_number': game_state.round_number,
            'current_player': game_state.current_player,
            'lead_player': game_state.lead_player,
            'dealer_id': game_state.dealer_id,
            'trump_suit': game_state.trump_suit.value if game_state.trump_suit else None,
            'trump_rank': game_state.trump_rank.value,
            'trump_declarer': game_state.trump_declarer,
            'trump_bid_level': game_state.trump_bid_level,
            'trump_locked': game_state.trump_locked,
            'players': players_data,
            'current_trick': current_trick,
            'team_scores': game_state.collected_points,
            'scoring_cards': scoring_cards_data,
            'bottom_cards': bottom_cards_data,
            'play_history': game_state.play_history[-20:],  # Send last 20 plays
            'team_levels': game_state.team_levels,
            'game_over': self.controller.rule_engine.is_game_over()
        }

    def get_game_info(self) -> dict:
        """Get basic game information"""
        return {
            'started': self.game_started,
            'players_count': len(self.players),
            'players': [
                {'id': pid, 'name': self.player_names[sid]}
                for sid, pid in sorted(self.players.items(), key=lambda x: x[1])
            ]
        }

    def remove_player_by_id(self, player_id_to_remove: int) -> dict:
        """根据player_id移除特定玩家"""
        if self.game_started:
            return {
                'success': False,
                'message': '游戏已开始，无法移除玩家'
            }
        
        # 找到对应的sid
        target_sid = None
        for sid, pid in self.players.items():
            if pid == player_id_to_remove:
                target_sid = sid
                break
        
        if not target_sid:
            return {
                'success': False,
                'message': f'未找到玩家 {player_id_to_remove}'
            }
        
        # 获取玩家信息
        player_name = self.player_names.get(target_sid, f'Player_{player_id_to_remove}')
        
        # 如果是AI玩家，从AI管理器中移除
        if target_sid.startswith('ai_player_'):
            self.ai_manager.remove_ai_player(player_id_to_remove)
        
        # 从玩家列表中移除
        del self.players[target_sid]
        del self.player_names[target_sid]
        
        logger.info(f"移除玩家: {player_name} (id: {player_id_to_remove})")
        
        return {
            'success': True,
            'message': f'成功移除玩家 {player_name}',
            'removed_player': {
                'id': player_id_to_remove,
                'name': player_name
            }
        }

    def clear_ai_players(self):
        """清除所有AI玩家"""
        ai_sids = [sid for sid in self.players.keys() if sid.startswith('ai_player_')]
        for sid in ai_sids:
            player_id = self.players[sid]
            name = self.player_names.get(sid, 'Unknown')
            
            # 从AI管理器中移除
            self.ai_manager.remove_ai_player(player_id)
            
            # 从玩家列表中移除
            del self.players[sid]
            del self.player_names[sid]
            logger.info(f"清除AI玩家: {name} (id: {player_id})")

    def reset_game(self):
        """Reset the game"""
        self.controller = GameController()
        self.game_started = False
        
        # 清除所有AI玩家
        self.clear_ai_players()
        
        # 清理AI管理器
        self.ai_manager.clear_all()
        
        logger.info("Game reset - AI players cleared")
