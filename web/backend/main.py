"""
Gulugulu Poker - Backend API Server
FastAPI + SocketIO for real-time poker game
"""
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import logging
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import uvicorn

from src.controller import GameController
from game_manager import GameManager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Gulugulu Poker API",
    description="Real-time multiplayer poker game (Shengji/Tractor)",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:6001"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['http://localhost:6001'],
    logger=True,
    engineio_logger=True
)

# Wrap with ASGI app
socket_app = socketio.ASGIApp(sio, app)

# Game manager instance
game_manager = GameManager()


# HTTP Endpoints
@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Gulugulu Poker API",
        "version": "1.0.0",
        "docs": "/docs",
        "ws": "ws://localhost:6005"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "gulugulu-poker"}


@app.get("/api/game/status")
def get_game_status():
    """Get current game status"""
    return game_manager.get_game_info()


# Socket.IO Event Handlers
@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    logger.info(f"Client connected: {sid}")
    await sio.emit('connection_established', {'sid': sid}, to=sid)


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {sid}")
    game_manager.remove_player(sid)
    await broadcast_game_state()


@sio.event
async def join_game(sid, data):
    """Handle player joining game"""
    player_name = data.get('name', f'Player-{sid[:6]}')
    logger.info(f"Player {player_name} joining game (sid: {sid})")

    result = game_manager.add_player(sid, player_name)

    if result['success']:
        # Send confirmation to player
        await sio.emit('join_success', result, to=sid)

        # Broadcast updated game state to all players
        await broadcast_game_state()

        # If 4 players, auto-start game
        if game_manager.can_start_game():
            logger.info("4 players joined, starting game...")
            start_result = game_manager.start_game()
            await broadcast_game_state()
            
            # Check if the first player is AI and trigger AI turn
            await trigger_ai_turn_if_needed()
    else:
        await sio.emit('join_error', result, to=sid)


@sio.event
async def play_cards(sid, data):
    """Handle player playing cards"""
    card_indices = data.get('card_indices', [])
    logger.info(f"Player {sid[:6]} playing cards: {card_indices}")

    result = game_manager.play_cards(sid, card_indices)

    if result['success']:
        # Broadcast updated game state to all players
        await broadcast_game_state()

        # If round or game ended, send specific notification
        if result.get('round_end'):
            await sio.emit('round_complete', result, room=None)
        if result.get('game_end'):
            await sio.emit('game_complete', result, room=None)
            # 游戏结束后清理AI玩家，允许人类玩家重新加入
            game_manager.clear_ai_players()
            await broadcast_game_state()
        else:
            # 如果游戏继续且下一个玩家是AI，触发AI自动出牌
            await trigger_ai_turn_if_needed()
    else:
        # Send error to specific player
        await sio.emit('play_error', result, to=sid)


@sio.event
async def request_game_state(sid):
    """Handle request for current game state"""
    state = game_manager.get_game_state_for_all()
    await sio.emit('game_state', state, to=sid)


@sio.event
async def deal_next_batch(sid, data):
    """Handle dealing next batch of cards"""
    cards_per_player = data.get('cards_per_player', 3)
    logger.info(f"Dealing next batch: {cards_per_player} cards per player")

    result = game_manager.deal_next_batch(cards_per_player)

    if result['success']:
        # Broadcast game state after dealing
        await broadcast_game_state()

        # Notify about the dealt cards
        await sio.emit('cards_dealt', result, room=None)
    else:
        await sio.emit('deal_error', result, to=sid)


@sio.event
async def declare_trump(sid, data):
    """Handle trump declaration"""
    card_indices = data.get('card_indices', [])
    declared_suit = data.get('suit')  # Optional, required for jokers

    logger.info(f"Player {sid[:6]} declaring trump with cards at indices: {card_indices}, suit: {declared_suit}")

    result = game_manager.declare_trump(sid, card_indices, declared_suit)

    if result['success']:
        # Broadcast trump declaration to all players
        await sio.emit('trump_declared', {
            'player_id': game_manager.players[sid],
            'message': result['message']
        }, room=None)

        # Broadcast updated game state
        await broadcast_game_state()
    else:
        # Send error to specific player
        await sio.emit('trump_error', result, to=sid)


@sio.event
async def complete_dealing(sid):
    """Handle completing the dealing phase"""
    logger.info(f"Complete dealing requested by {sid[:6]}")

    result = game_manager.complete_dealing()

    if result['success']:
        await broadcast_game_state()
        await sio.emit('dealing_complete', result, room=None)
    else:
        await sio.emit('complete_error', result, to=sid)


@sio.event
async def add_ai_player(sid):
    """Handle adding AI player request"""
    try:
        logger.info(f"Add AI player requested by {sid[:6]}")
        
        result = game_manager.add_ai_player()
        
        if result['success']:
            logger.info(f"AI player added successfully: {result['player_name']}")
            # Broadcast updated game state to all players
            await broadcast_game_state()
            
            # If 4 players, auto-start game
            if game_manager.can_start_game():
                logger.info("4 players joined (including AI), starting game...")
                start_result = game_manager.start_game()
                await broadcast_game_state()
                
                # Check if the first player is AI and trigger AI turn
                await trigger_ai_turn_if_needed()
        else:
            logger.error(f"Failed to add AI player: {result['message']}")
            await sio.emit('ai_add_error', result, to=sid)
            
    except Exception as e:
        logger.error(f"Exception in add_ai_player: {e}")
        await sio.emit('ai_add_error', {'success': False, 'message': f'Error: {str(e)}'}, to=sid)


@sio.event
async def clear_ai_players(sid):
    """Handle clearing AI players request"""
    logger.info(f"Clear AI players requested by {sid[:6]}")
    game_manager.clear_ai_players()
    await broadcast_game_state()


@sio.event
async def remove_player_by_id(sid, data):
    """Handle removing a specific player by ID"""
    try:
        player_id_to_remove = data.get('player_id')
        logger.info(f"Remove player {player_id_to_remove} requested by {sid[:6]}")
        
        result = game_manager.remove_player_by_id(player_id_to_remove)
        
        if result['success']:
            logger.info(f"Player {player_id_to_remove} removed successfully")
            # Broadcast updated game state to all players
            await broadcast_game_state()
        else:
            logger.error(f"Failed to remove player: {result['message']}")
            await sio.emit('remove_player_error', result, to=sid)
            
    except Exception as e:
        logger.error(f"Exception in remove_player_by_id: {e}")
        await sio.emit('remove_player_error', {'success': False, 'message': f'Error: {str(e)}'}, to=sid)


@sio.event
async def restart_game(sid):
    """Handle game restart request"""
    logger.info(f"Game restart requested by {sid[:6]}")
    game_manager.reset_game()
    await broadcast_game_state()


async def broadcast_game_state():
    """Broadcast current game state to all connected players"""
    state = game_manager.get_game_state_for_all()
    await sio.emit('game_state', state, room=None)



async def trigger_ai_turn_if_needed():
    """如果当前轮到AI玩家，触发AI自动出牌"""
    try:
        game_state = game_manager.get_game_state_for_all()
        if not game_state.get('started'):
            logger.info("游戏未开始，跳过AI触发")
            return
            
        current_player_id = game_state.get('current_player')
        logger.info(f"检查当前玩家 {current_player_id} 是否为AI")
        
        if current_player_id is not None and game_manager.ai_manager.is_ai_player(current_player_id):
            logger.info(f"AI玩家 {current_player_id} 触发自动出牌")
            
            # 稍微延迟，让玩家看到游戏状态变化
            await asyncio.sleep(2)
            
            # AI自动出牌
            result = await game_manager.ai_auto_play()
            
            if result['success']:
                logger.info(f"AI玩家 {current_player_id} 出牌成功")
                # 广播游戏状态
                await broadcast_game_state()
                
                # 检查游戏是否结束
                if result.get('round_end'):
                    await sio.emit('round_complete', result, room=None)
                elif result.get('game_end'):
                    await sio.emit('game_complete', result, room=None)
                    # 游戏结束后清理AI玩家
                    game_manager.clear_ai_players()
                    await broadcast_game_state()
                else:
                    # 递归检查下一个玩家是否也是AI
                    await trigger_ai_turn_if_needed()
            else:
                logger.error(f"AI自动出牌失败: {result.get('message')}")
        else:
            logger.info(f"当前玩家 {current_player_id} 不是AI，无需触发")
                
    except Exception as e:
        logger.error(f"触发AI回合错误: {e}")


if __name__ == "__main__":
    logger.info("Starting Gulugulu Poker Backend...")
    logger.info("API Documentation: http://localhost:6005/docs")
    logger.info("WebSocket: ws://localhost:6005")
    uvicorn.run(socket_app, host="0.0.0.0", port=6005, log_level="info")
