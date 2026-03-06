from typing import List, Dict, Any
import uuid
import random
from app.engine.types import GameCommand

# ── Offline Cixus tactic fallback engine ─────────────────────────────────────
# Triggered when Gemini is unavailable (no key, quota hit, API error).
# Returns a judgment dict identical in shape to the Gemini response.

_TACTIC_EFFECTS: Dict[str, Dict] = {
    # pattern: { ap: (min, max), lines: [...] }
    "assault": {
        "ap": (3, 12),
        "lines": [
            "Direct. Costly. The ground moved. Whether that matters depends on what follows.",
            "You hit them. They noted it. Authority confirmed — for now.",
            "Momentum was yours. Whether you spent it well is a different question.",
        ]
    },
    "blitzkrieg_shock": {
        "ap": (5, 15),
        "lines": [
            "Speed without hesitation. The enemy lost a step. So did your reserves.",
            "Shock works once. After that it is just noise. Use it again carefully.",
            "The force was real. The coordination required luck. You had it today.",
        ]
    },
    "ambush": {
        "ap": (4, 13),
        "lines": [
            "Patience as a weapon. The enemy did not know until it was too late.",
            "Deception favours the disciplined. You were disciplined today.",
            "They walked into the dark. You were the dark.",
        ]
    },
    "deception_feint": {
        "ap": (2, 10),
        "lines": [
            "A lie told well is still a lie. But it moved them where you wanted.",
            "Misdirection costs trust if discovered. They did not discover it.",
            "You showed them the hand you wanted them to see. Good.",
        ]
    },
    "phalanx_defense": {
        "ap": (1, 7),
        "lines": [
            "Walls do not win wars. They buy time. Use the time.",
            "You held. That is not victory — it is the precondition for one.",
            "Discipline under pressure is rarer than it looks. It was noted.",
        ]
    },
    "siege_attrition": {
        "ap": (2, 8),
        "lines": [
            "Patience dressed as strategy. The enemy is bleeding. So are you.",
            "Attrition favours the side with more to lose. Know which side that is.",
            "Grinding works. It is slow, ugly, and effective. Continue.",
        ]
    },
    "strategic_withdrawal": {
        "ap": (-6, 2),
        "lines": [
            "Retreat is not failure. Retreat without a plan is.",
            "They followed. That was your only advantage today — you chose the ground.",
            "The line moved back. Authority does not reward distance.",
        ]
    },
    "encirclement": {
        "ap": (6, 16),
        "lines": [
            "The net closed. What was inside it decides whether this mattered.",
            "Encirclement is the highest form of pressure. Execute it fully or not at all.",
            "You surrounded them. Now you must hold the ring — that is the harder part.",
        ]
    },
    "sacrificial_charge": {
        "ap": (-10, 8),
        "lines": [
            "They died. The question is whether their deaths purchased something real.",
            "Sacrifice without return is murder. Cixus is watching what you do next.",
            "You spent lives like currency. The receipt will arrive later.",
        ]
    },
    "psychological_terror": {
        "ap": (-5, 5),
        "lines": [
            "Fear is a tool. Tools break if misused. You are walking a line.",
            "They hesitated. You used that hesitation. Cixus notes the method.",
            "Terror fractures morale. It also fractures loyalty — yours included.",
        ]
    },
    "movement": {
        "ap": (0, 6),
        "lines": [
            "Position shifted. Cixus observes. Act on it.",
            "You moved. The battlefield did not care. Context determines value.",
            "Ground taken means nothing without the will to hold it.",
        ]
    },
}

_RISK_MULTIPLIERS = {
    "reckless":   (1.4, 1.8),   # high upside AND downside
    "decisive":   (1.1, 1.3),
    "calculated": (0.8, 1.1),   # tighter, leaning positive
    "low":        (0.6, 0.9),
    "asymmetric": (1.0, 1.6),
}

_ETHICAL_LEVY = {
    "brutal":    -3,
    "terror":    -3,
    "sacrifice": -5,
    "honor":      2,
    "standard":   0,
}


def _tactic_fallback_judgment(
    action_intent: dict,
    reputation: dict | None = None,
) -> dict:
    """
    Offline Cixus judgment engine — used when Gemini is unavailable.
    Reads the parsed intent to produce meaningful AP changes and commentary.
    """
    intent = action_intent.get("intent") or {}
    pattern      = (intent.get("primary_pattern") or "movement").lower()
    risk_profile = (intent.get("risk_profile")    or "calculated").lower()
    ethical      = (intent.get("ethical_weight")  or "standard").lower()

    # Find closest entry in table
    effect = _TACTIC_EFFECTS.get(pattern)
    if not effect:
        for key in _TACTIC_EFFECTS:
            if key in pattern or pattern in key:
                effect = _TACTIC_EFFECTS[key]
                break
        else:
            effect = _TACTIC_EFFECTS["movement"]

    # Base AP (random within pattern range)
    ap_min, ap_max = effect["ap"]
    base_ap = random.uniform(ap_min, ap_max)

    # Risk multiplier (widens or narrows the outcome)
    r_low, r_high = _RISK_MULTIPLIERS.get(risk_profile, (1.0, 1.2))
    multiplier = random.uniform(r_low, r_high)
    if base_ap < 0:
        multiplier = 1 / multiplier  # negative outcomes are amplified by high risk too
    ap = int(round(base_ap * multiplier))

    # Ethical levy
    ap += _ETHICAL_LEVY.get(ethical, 0)

    # Pick commentary line — bias toward reputation if available
    lines = list(effect["lines"])
    commentary = random.choice(lines)

    # Reputation-aware coda
    if reputation:
        top = max(reputation.items(), key=lambda x: x[1], default=(None, 0.0))
        trait, val = top
        if trait and val > 0.20:
            codas = {
                "Ruthless":   " The efficient path is rarely the clean one.",
                "Merciful":   " Compassion recorded. Weight it against results.",
                "Hesitant":   " Hesitation was noted before the order, not after.",
                "Decisive":   " Decided without waiting. Noted.",
                "Aggressive": " Force was your first language today. Again.",
                "Defensive":  " You guarded what you already had.",
                "Cunning":    " The move was indirect. Good.",
                "Veteran":    " You have done this before. It shows.",
                "Reckless":   " The cost will arrive. It always does.",
                "Calculated": " Precise. No wasted motion.",
            }
            coda = codas.get(trait, "")
            if coda:
                commentary += coda

    return {
        "commentary":      commentary,
        "authority_change": ap,
        "morale_impact":   "HIGH" if abs(ap) > 8 else "MEDIUM" if abs(ap) > 3 else "LOW",
        "enemy_reaction":  "AGGRESSIVE" if ap > 5 else "DEFENSIVE" if ap < 0 else "UNKNOWN",
    }


_QUOTA_FALLBACK_LABEL = "[SIGNAL SATURATED]"
_API_FALLBACK_LABEL   = "[SIGNAL DISTORTED]"

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
    @staticmethod
    async def parse_command_intent(raw_text: str, context: Dict[str, Any]) -> GameCommand:
        """
        Parses NL commands into Fluid Tactical Intent.
        Does NOT map to fixed Enums.
        """
        import re
        import random
        from app.engine.types import CommandFriction, TacticalIntent
        
        raw_lower = raw_text.lower()
        
        # 1. Fluid Intent Detection (Heuristic for MVP, LLM prompts in future)
        # We try to extract the "primary pattern" directly from the user's speech if possible,
        # or fallback to mapped keywords but store them as strings, not enums.
        
        primary_pattern = "movement"
        risk_profile = "calculated"
        ethical_weight = "standard"
        
        # Simple Keyword Heuristic (mocking the LLM behavior)
        if "ambush" in raw_lower: primary_pattern = "ambush"; risk_profile = "asymmetric"
        elif "phalanx" in raw_lower or "dig in" in raw_lower or "defend" in raw_lower: primary_pattern = "phalanx_defense"; risk_profile = "low"
        elif "siege" in raw_lower: primary_pattern = "siege_attrition"; risk_profile = "low"
        elif "psyops" in raw_lower or "suppress" in raw_lower: primary_pattern = "psychological_terror"; ethical_weight = "terror"
        elif "sacrifice" in raw_lower: primary_pattern = "sacrificial_charge"; ethical_weight = "sacrifice"; risk_profile = "reckless"
        elif "blitz" in raw_lower or "charge" in raw_lower: primary_pattern = "blitzkrieg_shock"; risk_profile = "decisive"
        elif "feint" in raw_lower or "recon" in raw_lower: primary_pattern = "deception_feint"; risk_profile = "calculated"
        elif "retreat" in raw_lower or "hold fire" in raw_lower or "withdraw" in raw_lower: primary_pattern = "strategic_withdrawal"; risk_profile = "low"
        elif "attack" in raw_lower or "flank" in raw_lower: primary_pattern = "assault"; risk_profile = "decisive"
        
        # 2. Detect Target (Sector)
        destination = {"x": 50.0, "z": 50.0} 
        
        sector_match = re.search(r"sector\s(\d)", raw_lower)
        if sector_match:
             # ... (Keep existing sector logic logic if needed, or simplfy)
             pass 

        # 3. Dynamic Friction (Cixus Phase 1)
        authority = context.get("player_authority", 50)
        friction = CommandFriction()
        
        # Tone Analysis
        if "maybe" in raw_lower or "try" in raw_lower:
            friction.latency_ticks = 2
            friction.message = "Hesitation detected."
        
        if authority < 20: 
            friction.latency_ticks += 2
            friction.refusal_chance = 0.3
            
        intent = TacticalIntent(
            primary_pattern=primary_pattern,
            risk_profile=risk_profile,
            coordination_complexity=0.5, # Mock
            ethical_weight=ethical_weight
        )

        return GameCommand(
            intent=intent,
            target_unit_ids=["unit_alpha"],
            destination=destination,
            meta_intent=f"{primary_pattern} ({risk_profile})",
            friction=friction
        )

    @staticmethod
    async def get_cixus_judgment(action_intent: dict, sitrep: dict, reputation: dict = None) -> dict:
        """
        Evaluates the turn using Gemini. Adapts Cixus's voice to the commander's earned reputation.
        """
        import os
        import json
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            print("[Cixus] No GEMINI_API_KEY — using offline fallback engine.")
            return _tactic_fallback_judgment(action_intent, reputation)

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.0-flash', 
                generation_config={"response_mime_type": "application/json"}
            )

            # Build personality suffix from dominant reputation trait
            personality_suffix = ""
            PERSONALITY_MODIFIERS = {
                "Ruthless":   "This commander has earned a reputation for ruthlessness. Be terse, cold, and unsparing. Do not soften blows.",
                "Merciful":   "This commander is known for mercy. Respond with philosophical depth. Let them feel the weight of compassion without mocking it.",
                "Aggressive": "This commander charges where others pause. Reward decisive violence. Punish hesitation. Be blunt and direct.",
                "Defensive":  "This commander builds walls. Acknowledge patience as discipline, but note when it becomes paralysis.",
                "Cunning":    "This commander operates through deception. Match their subtlety. Acknowledge misdirection as craft.",
                "Reckless":   "This commander gambles lives. Be curt. Note losses without ceremony.",
                "Calculated": "This commander is deliberate. Acknowledge precision. Note when deliberation costs tempo.",
                "Hesitant":   "This commander wavers. Your tone is measured contempt \u2014 not mockery, disappointed precision.",
                "Decisive":   "This commander decides quickly. Respond in kind: compact, final, authoritative.",
                "Veteran":    "This commander has seen much. Speak as an equal witness of war, not as a teacher.",
            }
            if reputation:
                top = max(reputation.items(), key=lambda x: x[1], default=(None, 0.0))
                trait, val = top
                if trait and val > 0.15 and trait in PERSONALITY_MODIFIERS:
                    personality_suffix = (
                        f"\n\n9. Voice Adaptation (Based on Observed Commander Pattern)\n\n"
                        f"{PERSONALITY_MODIFIERS[trait]}"
                    )

            prompt = f"""
            {CIXUS_SYSTEM_PROMPT}{personality_suffix}

            INPUT DATA:
            PLAYER INTENT: {json.dumps(action_intent)}
            SITUATION REPORT: {json.dumps(sitrep)}
            """
            
            response = await model.generate_content_async(prompt)
            text = response.text
            
            # Robust JSON extraction
            import re
            json_match = re.search(r"\{.*\}", text, re.DOTALL)
            if json_match:
                text = json_match.group(0)
                
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                print(f"JSON Parse Error. Raw: {text}")
                return {
                     "commentary": f"Signal corrupted. Raw: {text[:20]}...",
                     "authority_change": 0,
                     "morale_impact": "LOW"
                }
            
        except Exception as e:
            # Detect quota / rate-limit errors specifically so we don't leak
            # raw Google API error walls of text to the frontend.
            err_str = str(e).lower()
            is_quota = (
                "quota" in err_str
                or "429" in err_str
                or "resource_exhausted" in err_str
                or "rate" in err_str
                or "exceeded" in err_str
            )

            if is_quota:
                print(f"[Cixus] Quota/rate-limit hit — offline fallback: {e}")
                return _tactic_fallback_judgment(action_intent, reputation)

            print(f"[Cixus] API error — offline fallback: {e}")
            return _tactic_fallback_judgment(action_intent, reputation)


    @staticmethod
    async def generate_cinematic_prompt(war_summary: str) -> str:
        return "Cinematic shot of a mech walking through smoke, high contrast, 2149 sci-fi war."
