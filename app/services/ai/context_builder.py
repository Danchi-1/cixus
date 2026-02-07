from typing import List, Dict, Any
from app.models.war import WarSession
from app.engine.types import GameState

class ContextBuilder:
    """
    Assembles the RAG context for Cixus.
    Combines: History + Traits + Current Situation.
    """
    
    @staticmethod
    def build_judgment_context(war: WarSession, current_state: GameState, recent_logs: List[str], player_pkg: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Creates the payload to send to Cixus for judgment.
        Now includes Deep Context.
        """
        # 1. Trait Context (Mock for now, would come from Enemy Profile)
        # In future, pull from war.general.traits
        enemy_traits = ["Aggressive", "Observant", "Ruthless"]
        
        # 2. Situational awareness
        casualty_report = ContextBuilder._analyze_casualties(current_state)
        
        # 3. Terrain / Environmental Context
        # Flatten modifiers for AI
        terrain_context = current_state.terrain_modifiers
        
        return {
            "war_id": str(war.id),
            "enemy_traits": enemy_traits,
            "turn_count": current_state.turn_count,
            "casualties": casualty_report,
            "recent_events": recent_logs,
            "terrain": terrain_context,
            "player_authority": player_pkg.get("authority", 50) if player_pkg else 50,
            "authority_trend": player_pkg.get("trend", "stable") if player_pkg else "stable"
        }

    @staticmethod
    def _analyze_casualties(state: GameState) -> Dict[str, int]:
        # Count dead units
        dead_player = len([u for u in state.player_units if u.status == "DEAD"])
        dead_enemy = len([u for u in state.enemy_units if u.status == "DEAD"])
        return {
            "player_lost": dead_player,
            "enemy_lost": dead_enemy
        }
