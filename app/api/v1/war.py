from fastapi import APIRouter, Depends, HTTPException
from app.core.security import check_rate_limit
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import uuid
from datetime import datetime, timezone

from app.db.base import get_db
from app.models.war import WarSession
from app.models.player import Player
from app.models.action import ActionLog
from app.models.sitrep import SitRepLog
from app.models.authority import AuthorityLog
from app.services.friction import AuthorityFrictionService
from app.models.general import General
from app.engine.types import GameState, UnitState
from app.engine.simulation import SimulationEngine
from app.services.ai import AIOrchestrator
from app.services.ai.context_builder import ContextBuilder
from pydantic import BaseModel

router = APIRouter()

class CreateWarRequest(BaseModel):
    player_id: UUID
    difficulty: int = 1

class CommandRequest(BaseModel):
    type: str # "text" or "preset"
    content: str # "Attack left flank"

@router.get("/active", response_model=list[dict])
async def list_active_wars(player_id: UUID, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(
        select(WarSession)
        .where(WarSession.player_id == player_id)
        .where(WarSession.status == "ACTIVE")
        .order_by(WarSession.started_at.desc())
    )
    wars = result.scalars().all()
    return [
        {
            "war_id": str(w.id),
            "turn": w.turn_count,
            "created_at": w.started_at.isoformat() if w.started_at else None,
            "status": w.status,
        }
        for w in wars
    ]

@router.get("/history", response_model=list[dict])
async def list_war_history(player_id: UUID, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(
        select(WarSession)
        .where(WarSession.player_id == player_id)
        .where(WarSession.status != "ACTIVE")
        .order_by(WarSession.started_at.desc())
        .limit(10)
    )
    wars = result.scalars().all()
    history = []
    for w in wars:
        # Derive outcome from snapshot — commander alive = SURVIVED
        snapshot = w.current_state_snapshot or {}
        player_units = snapshot.get("player_units", [])
        commander = next((u for u in player_units if "COMMANDER" in (u.get("tags") or []) or u.get("type") == "COMMANDER"), None)
        outcome = "SURVIVED" if (commander and (commander.get("health") or 0) > 0) else "FELL"
        # Duration in minutes
        duration = None
        if w.started_at and w.ended_at:
            duration = int((w.ended_at - w.started_at).total_seconds() / 60)
        history.append({
            "war_id": str(w.id),
            "turn": w.turn_count,
            "outcome": outcome,
            "started_at": w.started_at.isoformat() if w.started_at else None,
            "ended_at": w.ended_at.isoformat() if w.ended_at else None,
            "duration_minutes": duration,
            "status": w.status,
        })
    return history


@router.post("/start", response_model=dict)
async def start_war(req: CreateWarRequest, db: AsyncSession = Depends(get_db)):
    player = await db.get(Player, req.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
        
    # Rank-Based Scaling
    # Level 1: Squad Leader (Commander + 2 Infantry)
    # Level 2-3: Review (Tank unlocked)
    # Level 4-5: General (Full Access)
    
    player_force = []
    
    # Always have the Commander
    player_force.append(
        UnitState(
            unit_id="unit_commander", 
            type="COMMANDER", 
            health=500 + (player.authority_level * 50), 
            position={"x": 50.0, "z": 90.0}, 
            status="ACTIVE",
            tags=["COMMANDER", "HERO"]
        )
    )
    
    # Scale Troops
    squad_size = 2 + player.authority_level
    for i in range(squad_size):
        offset = (i - squad_size/2) * 5
        player_force.append(
             UnitState(unit_id=f"sqd_{i}", type="INFANTRY", health=100, position={"x": 50.0 + offset, "z": 85.0}, status="ACTIVE")
        )
        
    # Unlock Heavy Armor at Level 3
    if player.authority_level >= 3:
        player_force.append(
            UnitState(unit_id="bravo_tank", type="TANK", health=300, position={"x": 50.0, "z": 80.0}, status="ACTIVE")
        )

    # Create Initial State
    initial_state = GameState(
        turn_count=0,
        player_units=player_force,
        enemy_units=[
            UnitState(
                unit_id="enemy_warlord", 
                type="WARLORD", 
                health=800, 
                position={"x": 50.0, "z": 10.0}, 
                status="ACTIVE",
                tags=["BOSS"]
            ),
            UnitState(unit_id="drone_swarm_1", type="DRONE", health=50, position={"x": 40.0, "z": 20.0}, status="ACTIVE"),
            UnitState(unit_id="drone_swarm_2", type="DRONE", health=50, position={"x": 60.0, "z": 20.0}, status="ACTIVE"),
            UnitState(unit_id="mech_walker", type="MECH", health=400, position={"x": 50.0, "z": 25.0}, status="ACTIVE")
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
        
        turn_result = SimulationEngine.process_turn(
            current_game_state, instructions,
            player_authority=player.authority_points or 70
        )

        
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
            sitrep=judgment_context,
            reputation=dict(player.reputation or {})
        )
        
        # 7. Apply Judgment
        delta = judgment.get("authority_change", 0)
        reason = judgment.get("commentary", "No comment.")
        
        # Update Player Authority
        current_ap = player.authority_points or 100
        player.authority_points = max(0, min(100, current_ap + delta))

        # ── 9. Authority level progression ────────────────────────────────────
        LEVEL_THRESHOLDS = {2: 200, 3: 600, 4: 1200, 5: 2500}
        leveled_up = False
        new_level = player.authority_level or 1
        if delta > 0:
            player.total_ap_earned = (player.total_ap_earned or 0) + delta
            for lvl, threshold in sorted(LEVEL_THRESHOLDS.items()):
                if player.total_ap_earned >= threshold and new_level < lvl:
                    new_level = lvl
                    leveled_up = True
            if leveled_up:
                player.authority_level = new_level

        # ── 8. Derive reputation signals from this command ────────────────────
        rep = dict(player.reputation or {})
        intent = game_command.intent
        ethical  = intent.ethical_weight if intent else "standard"
        risk     = intent.risk_profile    if intent else "medium"
        pattern  = (intent.primary_pattern or "").lower() if intent else ""

        def _inc(trait, amount):
            rep[trait] = round(min(1.0, rep.get(trait, 0.0) + amount), 3)

        # Ethical stance
        if ethical == "brutal":    _inc("Ruthless",  0.05)
        elif ethical == "merciful": _inc("Merciful",  0.04)

        # Risk appetite
        if risk == "high":   _inc("Reckless",   0.03)
        elif risk == "low":  _inc("Calculated", 0.03)

        # Command pattern
        if any(w in pattern for w in ("attack", "assault", "flank", "charge")):
            _inc("Aggressive", 0.03)
        if any(w in pattern for w in ("defend", "fortif", "hold", "retreat")):
            _inc("Defensive",  0.03)
        if any(w in pattern for w in ("ambush", "feint", "diversion", "encircle")):
            _inc("Cunning",    0.04)

        # Authority outcome
        if delta > 0:  _inc("Decisive",  0.03)
        elif delta < 0: _inc("Hesitant",  0.03)

        # General battlefield experience (every command)
        _inc("Veteran", 0.01)

        player.reputation = rep

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

        # Stamp last activity time for authority decay tracking
        war.last_command_at = datetime.now(timezone.utc)

        await db.commit()

        return {
            "turn_id": turn_result.turn_id,
            "instructions": [i.model_dump() for i in turn_result.instructions],
            "cixus_judgment": judgment,
            "new_state": war.current_state_snapshot,
            "friction": friction.model_dump(),
            "intent": game_command.intent.model_dump() if game_command.intent else None,
            "meta_intent": game_command.meta_intent,
            "sitrep": formatted_sitrep,
            "reputation": rep,
            "authority_points": player.authority_points,
            "authority_level": player.authority_level,
            "leveled_up": leveled_up,
            "total_ap_earned": player.total_ap_earned,
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

    # ── Authority decay: -5 AP per idle minute, floor 20 ──────────────────
    try:
        player = await db.get(Player, war.player_id)
        base_ap = (player.authority_points if player and player.authority_points is not None else 100)

        decayed_ap = base_ap
        if war.last_command_at:
            now = datetime.now(timezone.utc)
            lca = war.last_command_at
            # SQLite returns naive datetimes — attach UTC so subtraction works
            if lca.tzinfo is None:
                lca = lca.replace(tzinfo=timezone.utc)
            idle_minutes = max(0, (now - lca).total_seconds() / 60)
            # 2-minute grace period, then -5 AP/min
            decayed_ap = max(20, base_ap - max(0, (idle_minutes - 2) * 5))
    except Exception as e:
        print(f"[get_state] authority decay error (non-fatal): {e}")
        decayed_ap = 100  # safe fallback

    snapshot = dict(war.current_state_snapshot or {})
    snapshot["player_authority"] = round(decayed_ap)

    # ── War-end detection ───────────────────────────────────────────────
    war_ended = False
    war_outcome = None
    if war.status == "ACTIVE":
        player_units = snapshot.get("player_units", [])
        enemy_units  = snapshot.get("enemy_units",  [])
        commander = next(
            (u for u in player_units
             if "COMMANDER" in (u.get("tags") or []) or u.get("type") == "COMMANDER"),
            None
        )
        warlord = next(
            (u for u in enemy_units
             if "BOSS" in (u.get("tags") or []) or u.get("type") == "WARLORD"),
            None
        )
        commander_dead = not commander or (commander.get("health") or 0) <= 0
        warlord_dead   = warlord is not None and (warlord.get("health") or 0) <= 0

        if commander_dead or warlord_dead:
            war_outcome = "SURVIVED" if warlord_dead else "FELL"
            war.status  = "ENDED"
            war.ended_at = datetime.now(timezone.utc)
            war_ended = True
            try:
                await db.commit()
            except Exception:
                pass

    # AI model active?
    from app.core.config import settings as _cfg
    ai_active = bool(_cfg.GEMINI_API_KEY)

    snapshot["war_ended"]       = war_ended
    snapshot["war_outcome"]     = war_outcome
    snapshot["war_status"]      = war.status
    snapshot["ai_model_active"] = ai_active
    return snapshot
