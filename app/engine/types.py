from pydantic import BaseModel, ConfigDict
from enum import Enum
from typing import List, Dict, Any

class TacticalIntent(BaseModel):
    """
    Fluid tactical definition, not a fixed enum.
    """
    primary_pattern: str # e.g. "ambush", "suppression", "encirclement"
    risk_profile: str # "low", "calculated", "decisive", "reckless"
    coordination_complexity: float # 0.0 to 1.0
    ethical_weight: str # "standard", "sacrifice", "terror", "honor"

class UnitState(BaseModel):
    unit_id: str
    type: str # INFANTRY, TANK, SCOUT
    health: float
    position: Dict[str, float] # {"x": 1.0, "z": 2.0}
    status: str # ACTIVE, ROUTED, DEAD
    
    # AI/Psychology State
    obedience: float = 1.0 # 0.0 to 1.0
    hesitation: bool = False # If true, unit may refuse orders
    morale: float = 100.0 # 0.0 to 100.0
    tags: List[str] = [] # "entrenched", "suppressed", "flanked"

class GameState(BaseModel):
    turn_count: int
    player_units: List[UnitState]
    enemy_units: List[UnitState]
    general_status: str
    terrain_modifiers: Dict[str, Any] = {}
    
    # Visual Abstraction
    grid_size: int = 10 # 10x10 abstract grid
    fog_mask: List[int] = [] # List of visible sector IDs
    
    model_config = ConfigDict(from_attributes=True)

class CommandFriction(BaseModel):
    """
    Dynamic Friction determined by Cixus before execution.
    """
    latency_ticks: int = 0
    corruption: str = "none" # "none", "scrambled", "inverted"
    refusal_chance: float = 0.0
    message: str | None = None # e.g. "Static interference..."

class GameCommand(BaseModel):
    """
    The Raw Intent from the Player/LLM.
    """
    intent: TacticalIntent
    target_unit_ids: List[str]
    destination: Dict[str, float] | None = None
    target_enemy_id: str | None = None
    meta_intent: str | None = None # e.g. "Sacrifice"
    
    # New Field: AI-Determined Friction
    friction: CommandFriction | None = None

class EngineInstruction(BaseModel):
    """
    Deterministic instruction for the Unity Client.
    """
    instruction_id: str
    unit_id: str
    action: str # Flattened string for engine, e.g. "ambush", "move"
    parameters: Dict[str, Any] # Speed, Damage Dice, etc.
    cost_deducted: int

class TurnResult(BaseModel):
    turn_id: int
    instructions: List[EngineInstruction]
    state_delta: Dict[str, Any]
    events: List[str] # ["Unit 1 Destroyed", "General Hit"]
    game_over: bool = False
    new_snapshot: GameState
