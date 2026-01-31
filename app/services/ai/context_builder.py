from typing import List, Dict, Any
from app.models.war import WarSession
from app.engine.types import GameState

class ContextBuilder:
    """
    Assembles the RAG context for Cixus.
    Combines: History + Traits + Current Situation.
    """
    
    @staticmethod
    def build_judgment_context(war: WarSession, current_state: GameState, recent_logs: List[str]) -> Dict[str, Any]:
        """
        Creates the payload to send to Cixus for judgment.
        """
        # 1. Trait Context (Mock for now, would come from Enemy Profile)
        enemy_traits = ["Aggressive", "Observant", "Ruthless"]
        
        # 2. Situational awareness
        casualty_report = ContextBuilder._analyze_casualties(current_state)
        
        # 3. Recent History (Narrative compression)
        # In a real system, this would be the 'last_judgment_context' + new delta
        
        return {
            "war_id": str(war.id),
            "enemy_traits": enemy_traits,
            "turn_count": current_state.turn_count,
            "casualties": casualty_report,
            "recent_events": recent_logs,
            "player_authority": 50 # TODO: fetch real
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
