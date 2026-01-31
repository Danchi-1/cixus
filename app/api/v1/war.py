from fastapi import APIRouter, Depends, HTTPException
from app.core.security import check_rate_limit
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import uuid

from app.db.base import get_db
from app.models.war import WarSession
from app.models.player import Player
from app.models.action import ActionLog
from app.models.general import General
from app.engine.types import GameState, UnitState, GameCommand
from app.engine.simulation import SimulationEngine
from app.services.ai import AIOrchestrator
from pydantic import BaseModel

router = APIRouter()

class CreateWarRequest(BaseModel):
    player_id: UUID
    difficulty: int = 1

class CommandRequest(BaseModel):
    type: str # "text" or "preset"
    content: str # "Attack left flank"

@router.post("/start", response_model=dict)
async def start_war(req: CreateWarRequest, db: AsyncSession = Depends(get_db)):
    player = await db.get(Player, req.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
        
    # Create Initial State
    initial_state = GameState(
        turn_count=0,
        player_units=[
            UnitState(unit_id="unit_alpha", type="INFANTRY", health=100, position={"x": 0, "z": 0}, status="ACTIVE")
        ],
        enemy_units=[
            UnitState(unit_id="enemy_beta", type="TANK", health=200, position={"x": 100, "z": 100}, status="ACTIVE")
        ],
        general_status="ALIVE"
    )

    war = WarSession(
        player_id=player.id,
        current_state_snapshot=initial_state.model_dump(),
        status="ACTIVE"
    )
    db.add(war)
    await db.flush() # Get ID
    
    # Create Enemy General
    general = General(
        war_id=war.id,
        name="General Kael",
        difficulty_tier=req.difficulty,
        traits=["Aggressive"]
    )
    db.add(general)
    await db.commit()
    
    return {"war_id": war.id, "initial_state": initial_state.model_dump()}

@router.post("/{war_id}/command", response_model=dict, dependencies=[Depends(check_rate_limit)])
async def submit_command(war_id: UUID, cmd: CommandRequest, db: AsyncSession = Depends(get_db)):
    war = await db.get(WarSession, war_id)
    if not war:
        raise HTTPException(status_code=404, detail="War not found")
        
    player = await db.get(Player, war.player_id)
    
    # 1. AI Parse Intent
    # In reality, fetch context summary from war.history_summary
    game_command = await AIOrchestrator.parse_command_intent(cmd.content, war.history_summary)
    
    # 2. Simulation Safety Check
    current_game_state = GameState.model_validate(war.current_state_snapshot)
    instructions = SimulationEngine.validate_and_clamp(game_command, player, current_game_state)
    
    # 3. Process Turn (Authoritative Tick)
    turn_result = SimulationEngine.process_turn(current_game_state, instructions)
    
    # 4. Update DB
    war.current_state_snapshot = turn_result.new_snapshot.model_dump()
    war.turn_count = turn_result.turn_id
    
    # Log Action
    action_log = ActionLog(
        war_id=war.id,
        player_command_raw=cmd.content,
        parsed_action=game_command.model_dump(),
        outcome="SUCCESS",
        state_delta=turn_result.state_delta
    )
    db.add(action_log)
    
    # 5. Async Cixus Judge (Sync for MVP)
    judgment = await AIOrchestrator.get_cixus_judgment(action_log.parsed_action, {})
    action_log.cixus_evaluation = judgment
    
    # Update Authority
    player.authority_points += judgment.get("authority_change", 0)
    
    await db.commit()
    
    return {
        "turn_id": turn_result.turn_id,
        "instructions": [i.model_dump() for i in turn_result.instructions],
        "cixus_judgment": judgment,
        "new_state": war.current_state_snapshot
    }

@router.get("/{war_id}/state")
async def get_state(war_id: UUID, db: AsyncSession = Depends(get_db)):
    war = await db.get(WarSession, war_id)
    if not war:
        raise HTTPException(status_code=404, detail="War not found")
    return war.current_state_snapshot
