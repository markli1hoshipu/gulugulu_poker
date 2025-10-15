"""
Trump Declaration Manager - 亮主管理器
"""
from typing import List, Optional, Tuple
from ..core import Card, Suit, Rank, Player, GameState


class TrumpBid:
    """亮主出价"""

    def __init__(self, player_id: int, cards: List[Card], declared_suit: Optional[Suit] = None):
        self.player_id = player_id
        self.cards = cards
        self.declared_suit = declared_suit  # For jokers, player can declare any suit
        self.bid_level = self._calculate_bid_level()

    def _calculate_bid_level(self) -> float:
        """
        计算亮主级别
        3张大王=4.0, 3张小王=3.5, 3张级牌=3, 2张级牌=2, 1张级牌=1
        """
        if not self.cards:
            return 0

        # Check if all cards are the same
        first_card = self.cards[0]
        if not all(c.rank == first_card.rank for c in self.cards):
            return 0

        count = len(self.cards)

        if first_card.rank == Rank.BIG_JOKER:
            if count >= 3:
                return 4.0
            else:
                return 0  # Big jokers must be 3 to bid

        if first_card.rank == Rank.SMALL_JOKER:
            if count >= 3:
                return 3.5
            else:
                return 0  # Small jokers must be 3 to bid

        # Rank cards: 1, 2, or 3 cards
        if count in [1, 2, 3]:
            return float(count)

        return 0


class TrumpManager:
    """Trump declaration manager"""

    def __init__(self, game_state: GameState):
        self.game_state = game_state
        self.current_bid: Optional[TrumpBid] = None
        self.is_first_game = True  # Track if this is the first game ever

    def can_declare_trump(self, player: Player, cards: List[Card],
                         declared_suit: Optional[Suit] = None) -> Tuple[bool, str]:
        """
        Check if player can declare trump with given cards

        Args:
            player: Player making the bid
            cards: Cards to show
            declared_suit: Suit to declare (required for jokers)

        Returns:
            (can_declare, reason)
        """
        if not cards:
            return False, "必须出示牌"

        # Check if all cards are the same
        first_card = cards[0]
        if not all(c.rank == first_card.rank and c.suit == first_card.suit for c in cards):
            return False, "必须出示相同的牌"

        # Check if player has these cards
        for card in cards:
            if not player.has_card(card):
                return False, f"你没有这张牌: {card}"

        # First game special rule: only big joker can declare
        if self.is_first_game:
            if first_card.rank != Rank.BIG_JOKER:
                return False, "第一局只能用大王亮主"
            if len(cards) != 1:
                return False, "第一局用一张大王亮主"
            if not declared_suit:
                return False, "需要声明主花色"
            return True, ""

        # Create bid
        new_bid = TrumpBid(player.player_id, cards, declared_suit)

        if new_bid.bid_level == 0:
            return False, "无效的亮主组合"

        # For jokers, must declare a suit
        if first_card.is_joker() and not declared_suit:
            return False, "用王亮主必须声明花色"

        # For rank cards, suit is determined by the card
        if first_card.rank == self.game_state.trump_rank:
            if first_card.suit == Suit.JOKER:
                return False, "级牌不能是王"
            # Suit is the suit of the rank card
            new_bid.declared_suit = first_card.suit

        # Check if this bid is higher than current bid
        if self.current_bid:
            if new_bid.bid_level <= self.current_bid.bid_level:
                return False, f"亮主级别必须更高（当前: {self.current_bid.bid_level}）"

        return True, ""

    def declare_trump(self, player: Player, cards: List[Card],
                     declared_suit: Optional[Suit] = None) -> Tuple[bool, str]:
        """
        Declare trump

        Args:
            player: Player making the bid
            cards: Cards to show
            declared_suit: Suit to declare (required for jokers)

        Returns:
            (success, message)
        """
        can_declare, reason = self.can_declare_trump(player, cards, declared_suit)
        if not can_declare:
            return False, reason

        # Create and save the bid
        new_bid = TrumpBid(player.player_id, cards, declared_suit)
        self.current_bid = new_bid

        # Update game state
        self.game_state.trump_declarer = player.player_id
        self.game_state.trump_bid_level = new_bid.bid_level
        self.game_state.dealer_id = player.player_id

        # Set trump suit if not using jokers
        if new_bid.declared_suit:
            self.game_state.trump_suit = new_bid.declared_suit

        # Lock trump if bid level is high enough (2+ cards)
        if new_bid.bid_level >= 2:
            self.game_state.trump_locked = True

        return True, f"亮主成功！主花色: {new_bid.declared_suit.value if new_bid.declared_suit else '待定'}"

    def handle_first_game_suit_determination(self, card: Card):
        """
        For first game, after big joker declaration, determine suit by first card drawn

        Args:
            card: First suit card drawn after big joker declaration
        """
        if self.is_first_game and card.suit != Suit.JOKER:
            if not self.game_state.trump_suit:
                self.game_state.trump_suit = card.suit
                self.game_state.trump_locked = True

    def reset_for_new_round(self, is_first_game: bool = False):
        """Reset trump manager for a new round"""
        self.current_bid = None
        self.is_first_game = is_first_game
