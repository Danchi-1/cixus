import random
from pydantic import BaseModel

class FrictionProfile(BaseModel):
    latency_ticks: int
    corruption_level: str # "NONE", "MINOR", "MAJOR"
    refusal_chance: float # 0.0 - 1.0

class FrictionCalculator:
    """
    Determines the connectivity/noise level based on Authority.
    Does NOT judge the player; just simulates the "Fog of War" physics.
    """
    
    @staticmethod
    def calculate_friction(authority_points: int) -> FrictionProfile:
        # High Authority (>80): Perfect Comms
        if authority_points > 80:
            return FrictionProfile(latency_ticks=0, corruption_level="NONE", refusal_chance=0.0)
            
        # Medium Authority (50-80): Slight Delay
        if authority_points > 50:
             return FrictionProfile(latency_ticks=1, corruption_level="NONE", refusal_chance=0.0)

        # Low Authority (20-50): Static & Hesitation
        if authority_points > 20:
             return FrictionProfile(latency_ticks=2, corruption_level="MINOR", refusal_chance=0.1)
             
        # Critical Authority (<20): Chaos
        return FrictionProfile(
            latency_ticks=random.randint(2, 5), 
            corruption_level="MAJOR", 
            refusal_chance=0.4
        )
