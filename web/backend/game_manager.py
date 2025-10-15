"""
Game Manager - Manages game state and player sessions
"""
import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import logging
from typing import Dict, List, Optional
from src.controller import GameController
from src.core import GamePhase, Card

logger = logging.getLogger(__name__)


class GameManager:
    """Manages game sessions and player connections"""

    def __init__(self):
        self.controller = GameController()
        self.players: Dict[str, int] = {}  # sid -> player_id mapping
        self.player_names: Dict[str, str] = {}  # sid -> player_name mapping
        self.game_started = False

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

    def remove_player(self, sid: str):
        """Remove a player from the game"""
        if sid in self.players:
            player_id = self.players[sid]
            name = self.player_names.get(sid, 'Unknown')
            del self.players[sid]
            del self.player_names[sid]
            logger.info(f"Player {name} (id: {player_id}) removed")

            # Reset game if a player leaves
            if self.game_started:
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

            return {
                'success': True,
                'message': '游戏开始！开始发牌...'
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
            return {
                'success': False,
                'message': '出牌不合法，请检查规则'
            }

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

    def reset_game(self):
        """Reset the game"""
        self.controller = GameController()
        self.game_started = False
        # Keep players but reset game state
        logger.info("Game reset")
