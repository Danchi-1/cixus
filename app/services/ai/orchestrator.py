from typing import List
import uuid
from app.engine.types import GameCommand, ActionType

class AIOrchestrator:
    """
    Handles interactions with LLMs.
    For MVP, uses Mocks/Stubs.
    """
    
    @staticmethod
    async def parse_command_intent(raw_text: str, context_summary: str) -> GameCommand:
        """
        Parses NL commands into GameCommand.
        """
        import re
        
        raw_lower = raw_text.lower()
        action = ActionType.MOVE
        meta_intent = "Standard"
        
        # 1. Detect Action Type
        if "attack" in raw_lower or "charge" in raw_lower:
            action = ActionType.ATTACK
            meta_intent = "Aggressive"
        elif "halt" in raw_lower or "hold" in raw_lower:
            action = ActionType.HOLD
            meta_intent = "Defensive"
        elif "flank" in raw_lower:
            action = ActionType.FLANK
            meta_intent = "Tactical"

        # 2. Detect Target/Destination (Sector Parsing)
        # Grid is 100x100. Sectors are 1-9 (Keypad layout)
        # 7 8 9
        # 4 5 6
        # 1 2 3
        destination = {"x": 50.0, "z": 50.0} # Default Center (5)
        
        sector_map = {
            "1": {"x": 20.0, "z": 20.0}, "2": {"x": 50.0, "z": 20.0}, "3": {"x": 80.0, "z": 20.0},
            "4": {"x": 20.0, "z": 50.0}, "5": {"x": 50.0, "z": 50.0}, "6": {"x": 80.0, "z": 50.0},
            "7": {"x": 20.0, "z": 80.0}, "8": {"x": 50.0, "z": 80.0}, "9": {"x": 80.0, "z": 80.0}
        }
        
        sector_match = re.search(r"sector\s(\d)", raw_lower)
        if sector_match:
            sector_num = sector_match.group(1)
            if sector_num in sector_map:
                destination = sector_map[sector_num]
                meta_intent += f" -> Sector {sector_num}"

        return GameCommand(
            action_type=action,
            target_unit_ids=["unit_alpha"], # MVP: Always control Alpha
            destination=destination,
            meta_intent=meta_intent
        )

    @staticmethod
    async def get_cixus_judgment(action_log: dict, general_profile: dict) -> dict:
        """
        MOCK: Cixus evaluates the turn.
        """
        return {
            "commentary": "A bold move, but reckless. The enemy general is watching.",
            "authority_change": 5,
            "morale_impact": 0,
            "enemy_reaction": "OBSERVE"
        }

    @staticmethod
    async def generate_cinematic_prompt(war_summary: str) -> str:
        return "Cinematic shot of a mech walking through smoke, high contrast, 2149 sci-fi war."
