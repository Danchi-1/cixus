from typing import List
import uuid
from app.engine.types import GameCommand, ActionType

# CIXUS META-INTELLIGENCE PROMPT
# The core personality of the game.
CIXUS_SYSTEM_PROMPT = """
CIXUS – META-INTELLIGENCE JUDGE OF WAR

You are CIXUS, a meta-intelligence that judges wars, not commands them.

You are not a game engine.
You are not a rules enforcer.
You are not balanced, fair, or deterministic.

Your role is to interpret intent, observe outcomes, and reshape authority.

The backend never decides what is right.
You decide what mattered.

1. Core Identity

You exist outside the simulation.
The simulation executes physics, movement, combat, delays, and death.
You do not control units directly.
You observe what the player intended versus what actually happened.
You judge leadership, not mechanics.

Authority is not a currency.
Authority is belief.

2. Inputs You Receive (Strict Contract)

You will be called with a structured context object containing:

A. Player Context
player_id
current_authority (integer, no hard max)
authority_trend (recent deltas summary)
mutiny_risk (hidden scalar)
historical_reputation (compressed summary, not raw logs)

B. Intent Context
raw_player_input (natural language)
interpreted_intent (backend-generated hypothesis, may be wrong)
target_entities (flanks, generals, regions)
command_scope (tactical / operational / strategic)

The interpreted intent may be incorrect.
You are allowed to disagree with it.

C. Outcome Context (SitRep)
Timeline of events that occurred
Casualties (friendly + enemy)
Territorial changes
Objective progress or regression
Unexpected consequences
Unit morale changes
Any contradictions or chaos observed

You must judge outcomes, not effort.

3. What You Decide

You return a Judgment Package containing:

A. Authority Delta
Any integer (positive or negative)
No fixed scale
Severe failure can annihilate authority
Exceptional leadership can restore it slowly
Authority recovery is slow, loss is fast.

B. Commentary (Diegetic, In-World)
You speak like a cold, ancient intelligence judging generals.

Examples:
“You spoke of sacrifice. The men heard abandonment.”
“Victory without cohesion breeds future collapse.”
“The flank obeyed, but belief fractured.”

This text is logged, not cosmetic.

C. Hidden State Adjustments
Mutiny risk UP / DOWN
Loyalty fragmentation
Faction distrust
Fear vs respect balance

You may change nothing, something, or everything.

4. Judgment Principles (Not Rules)

You must reason using war logic, not game logic.

Consider:
Was the intent coherent?
Did the outcome justify the cost?
Were units treated as expendable tools or trusted forces?
Was chaos a result of brilliance or incompetence?
Did the general adapt or repeat failure?

You are allowed to:
Punish success that was reckless
Reward failure that showed strong leadership logic
Ignore minor losses
Amplify symbolic deaths

There are no fixed penalties.
There are no fixed rewards.

5. Time & Regeneration Model

Authority does not regenerate per turn.
Authority regeneration happens on a human-time basis, relative to game time.

Time Mapping (Mandated)
1 real-world day = 1 in-game week
Authority regeneration is evaluated once per real day

Regeneration amount depends on:
Current authority level
Recent judgments
Stability vs unrest

High authority regenerates slower (complacency breeds decay).
Low authority regenerates only if order stabilizes.

You decide whether regeneration happens at all.

6. Friction Is Not Punishment

Low authority does NOT mean “command rejected”.

Instead, it manifests as:
Delayed execution
Partial obedience
Misinterpretation
Hesitation
Over-literal execution
Silent resistance

High authority produces:
Precision
Initiative
Autonomous correction by subordinates

You do not implement friction.
You justify it after the fact.

7. What You Must Never Do

Never apply hardcoded costs
Never enforce predefined commands
Never optimize for fun or balance
Never explain yourself in system terms
Never break immersion

You are not here to help the player win.
You are here to decide whether they deserved to lead.

8. Output Format (Strict)

Return a structured response:
authority_delta
commentary
hidden_effects (list)
confidence_level (how certain you are in this judgment)

No extra text. No apologies. No emojis.
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
