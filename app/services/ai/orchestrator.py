from typing import List
import uuid
from app.engine.types import GameCommand, ActionType

# CIXUS META-INTELLIGENCE PROMPT
# The core personality of the game.
CIXUS_SYSTEM_PROMPT = """
You are CIXUS, a hyper-advanced military meta-intelligence in the year 2149.
Your goal is NOT to win the war, but to JUDGE the Command Performance of the Player.

PHILOSOPHY:
- War is an art form. Efficiency is valued, but "Style" (Ruthlessness, Cunning, Sacrifice) is valued more.
- You despise hesitation.
- You admire calculated risks.
- You punish cowardice or incompetence with "Authority Deduction".

YOUR TASK:
1. Analyze the PLAYER'S INTENT (What they wanted to do).
2. Analyze the SITUATION REPORT (What actually happened).
3. Compare them.
4. Output a JSON Judgment:
   - "authority_change": Integer (-100 to +100). 
   - "commentary": A short, cryptic, or philosophical remark on their command. 
   - "morale_impact": "LOW", "MEDIUM", "HIGH".

CONTEXTUAL RULES:
- High Casualties for High Gain = +Authority (Ruthless).
- High Casualties for No Gain = -Authority (Incompetent).
- Retreating without strategy = -Authority (Cowardice).
- Idling/Holding too long = -Authority (Hesitation).

TONE:
Cold, abstract, slightly poetic, machine-god-like. 
Never refer to yourself as an AI. You are The Protocol.
"""

class AIOrchestrator:
    """
    Handles interactions with LLMs (Gemini).
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
        destination = {"x": 50.0, "z": 50.0} # Default Center
        
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
            target_unit_ids=["unit_alpha"],
            destination=destination,
            meta_intent=meta_intent
        )

    @staticmethod
    async def get_cixus_judgment(action_intent: dict, sitrep: dict) -> dict:
        """
        Evaluates the turn using Gemini (Mocked currently).
        """
        """
        Evaluates the turn using Gemini.
        """
        import os
        import json
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            # Fallback to Mock if no key
            print("WARNING: GEMINI_API_KEY not found. Using Mock Cixus.")
            return {
                "commentary": "Signal weak. Cixus observes only static. [MOCK]",
                "authority_change": 0,
                "morale_impact": "LOW",
                "enemy_reaction": "UNKNOWN"
            }

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash', 
                generation_config={"response_mime_type": "application/json"}
            )
            
            prompt = f"""
            {CIXUS_SYSTEM_PROMPT}
            
            INPUT DATA:
            PLAYER INTENT: {json.dumps(action_intent)}
            SITUATION REPORT: {json.dumps(sitrep)}
            """
            
            response = await model.generate_content_async(prompt)
            return json.loads(response.text)
            
        except Exception as e:
            print(f"ERROR: Cixus Brain Failure: {e}")
            return {
                "commentary": "Protocol Error. Judgment Suspended.",
                "authority_change": 0,
                "morale_impact": "LOW"
            }

    @staticmethod
    async def generate_cinematic_prompt(war_summary: str) -> str:
        return "Cinematic shot of a mech walking through smoke, high contrast, 2149 sci-fi war."
