from pydantic import BaseModel, ConfigDict
from enum import Enum
from typing import List, Dict, Any

class ActionType(str, Enum):
    MOVE = "MOVE"
    ATTACK = "ATTACK"
    DEFEND = "DEFEND"
    RETREAT = "RETREAT"
    FLANK = "FLANK"
    HOLD = "HOLD"

class UnitState(BaseModel):
    unit_id: str
    type: str # INFANTRY, TANK, SCOUT
    health: float
    position: Dict[str, float] # {"x": 1.0, "z": 2.0}
    status: str # ACTIVE, ROUTED, DEAD
    
    # AI/Psychology State
    obedience: float = 1.0 # 0.0 to 1.0
    hesitation: bool = False # If true, unit may refuse orders

class GameState(BaseModel):
    turn_count: int
    player_units: List[UnitState]
    enemy_units: List[UnitState]
    general_status: str
    terrain_modifiers: Dict[str, Any] = {}
    
    model_config = ConfigDict(from_attributes=True)

class GameCommand(BaseModel):
    """
    The Raw Intent from the Player/LLM.
    """
    action_type: ActionType
    target_unit_ids: List[str]
    destination: Dict[str, float] | None = None
    target_enemy_id: str | None = None
    meta_intent: str | None = None # e.g. "Sacrifice"

class EngineInstruction(BaseModel):
    """
    Deterministic instruction for the Unity Client.
    """
    instruction_id: str
    unit_id: str
    action: ActionType
    parameters: Dict[str, Any] # Speed, Damage Dice, etc.
    cost_deducted: int

class TurnResult(BaseModel):
    turn_id: int
    instructions: List[EngineInstruction]
    state_delta: Dict[str, Any]
    events: List[str] # ["Unit 1 Destroyed", "General Hit"]
    game_over: bool = False
    new_snapshot: GameState
