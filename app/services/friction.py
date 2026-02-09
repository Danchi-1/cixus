from app.engine.types import CommandFriction
import random

class AuthorityFrictionService:
    """
    Determines how much "Friction" (Clausewitzian) applies to a command
    based on the player's current Authority.
    """
    
    @staticmethod
    def calculate_friction(authority: int) -> CommandFriction:
        friction = CommandFriction()
        
        # 1. High Authority (80-100) - Crisp Execution
        if authority >= 80:
            return friction # Default empty (perfect)
            
        # 2. Moderate Authority (50-79) - Minor Static
        if 50 <= authority < 80:
            if random.random() < 0.2:
                friction.latency_ticks = 1
                friction.message = "Signal relaying..."
            return friction
            
        # 3. Low Authority (20-49) - Significant Drag
        if 20 <= authority < 49:
            friction.latency_ticks = random.choice([1, 2, 3])
            friction.refusal_chance = 0.1
            friction.message = "Unit verifying encryption..."
            if random.random() < 0.3:
                friction.corruption = "scrambled"
            return friction
            
        # 4. Critical Authority (0-19) - Command Collapse
        # "They can hear you, they just don't believe you."
        friction.latency_ticks = random.choice([3, 5, 8])
        friction.refusal_chance = 0.4
        friction.message = "Static interference. Unit unresponsive."
        friction.corruption = "inverted"
        
        return friction
