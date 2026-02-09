from fastapi import APIRouter, Depends, HTTPException
from app.core.security import check_rate_limit
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import uuid

from app.db.base import get_db
from app.models.war import WarSession
from app.models.player import Player
from app.models.action import ActionLog
from app.models.sitrep import SitRepLog
from app.services.friction import AuthorityFrictionService

@router.post("/{war_id}/command", response_model=dict, dependencies=[Depends(check_rate_limit)])
async def submit_command(war_id: UUID, cmd: CommandRequest, db: AsyncSession = Depends(get_db)):
    try:
        war = await db.get(WarSession, war_id)
        if not war:
            raise HTTPException(status_code=404, detail="War not found")
            
        player = await db.get(Player, war.player_id)
        
        # 1. AI Parse Intent & Context
        game_command = await AIOrchestrator.parse_command_intent(cmd.content, {"player_authority": player.authority_points})
        
        # 2. Friction Layer (The Limiter)
        # Apply Authority-based Friction (Latency, Refusal, Drift)
        friction = AuthorityFrictionService.calculate_friction(player.authority_points or 100)
        game_command.friction = friction
        
        # 3. Simulation Execution (with Friction and Validation)
        current_game_state = GameState.model_validate(war.current_state_snapshot)
        
        # Validate & Clamp (Friction is verified here)
        instructions = SimulationEngine.validate_and_clamp(game_command, player, current_game_state)
        
        turn_result = SimulationEngine.process_turn(current_game_state, instructions)
        
        # 4. Update DB
        war.current_state_snapshot = turn_result.new_snapshot.model_dump()
        war.turn_count = turn_result.turn_id
        
        # 5. Log Action & Outcome (SitRep)
        formatted_sitrep = f"Events: {', '.join(turn_result.events)}."
        if turn_result.state_delta:
             formatted_sitrep += f" Visuals: {turn_result.state_delta}"
        
        # Save SitRep Log
        sitrep_log = SitRepLog(
            war_id=war.id,
            turn_id=war.turn_count,
            text_content=formatted_sitrep,
            structured_data={"events": turn_result.events, "delta": turn_result.state_delta},
            visual_context=turn_result.state_delta
        )
        db.add(sitrep_log)
        
        judgment_context = ContextBuilder.build_judgment_context(
            war, 
            turn_result.new_snapshot, 
            turn_result.events
        )
        
        # 6. Cixus Judgment (The Judge)
        judgment = await AIOrchestrator.get_cixus_judgment(
            action_intent=game_command.model_dump(), 
            sitrep=judgment_context
        )
        
        # 7. Apply Judgment
        delta = judgment.get("authority_change", 0)
        reason = judgment.get("commentary", "No comment.")
        
        # Update Player Authority
        current_ap = player.authority_points or 100
        player.authority_points = max(0, min(100, current_ap + delta))
        
        # Log Authority Change
        auth_log = AuthorityLog(
            war_id=war.id,
            turn_id=war.turn_count,
            delta=delta,
            reason=reason,
            context_snapshot=judgment_context
        )
        db.add(auth_log)
        
        # Log Action
        action_log = ActionLog(
            war_id=war.id,
            player_command_raw=cmd.content,
            parsed_action=game_command.model_dump(),
            outcome="SUCCESS",
            state_delta=turn_result.state_delta,
            cixus_evaluation=judgment
        )
        db.add(action_log)
        
        await db.commit()
        
        return {
            "turn_id": turn_result.turn_id,
            "instructions": [i.model_dump() for i in turn_result.instructions],
            "cixus_judgment": judgment,
            "new_state": war.current_state_snapshot,
            "friction": friction.model_dump(),
            "intent": game_command.intent.model_dump() if game_command.intent else None,
            "meta_intent": game_command.meta_intent,
            "sitrep": formatted_sitrep # Return to frontend for log
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Command Processing Failed: {str(e)}")

@router.get("/{war_id}/state")
async def get_state(war_id: UUID, db: AsyncSession = Depends(get_db)):
    war = await db.get(WarSession, war_id)
    if not war:
        raise HTTPException(status_code=404, detail="War not found")
    return war.current_state_snapshot
