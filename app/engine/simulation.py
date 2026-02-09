import uuid
from typing import List
from app.engine.types import GameState, GameCommand, EngineInstruction, TurnResult
from app.models.player import Player

class SimulationEngine:
    @staticmethod
    def validate_and_clamp(command: GameCommand, player: Player, state: GameState) -> List[EngineInstruction]:
        """
        The Safety Valve.
        Now purely a signal degrade/clamp layer.
        Does NOT judge authority or reject based on cost.
        """
        instructions = []
        
        # 1. Dynamic Friction Check (Refusal/Degradation is now probabilistic based on AI friction)
        # We don't "decide" to refuse here; we just execute the friction parameters
        if command.friction and command.friction.refusal_chance > 0:
            import random
            if random.random() < command.friction.refusal_chance:
                 # Command Refused (Corruption of Intent)
                 for uid in command.target_unit_ids:
                    instructions.append(EngineInstruction(
                        instruction_id=str(uuid.uuid4()),
                        unit_id=uid,
                        action="HOLD", # Default fallback
                        parameters={"reason": command.friction.message or "SIGNAL_LOST"},
                        cost_deducted=0
                    ))
                 return instructions

        # 2. Process Valid Command (No Authority Gate)
        for uid in command.target_unit_ids:
            # Mock physics: Unit can only move 10 units per turn.
            params = {}
            if command.destination:
                params["target_pos"] = command.destination
                params["speed"] = 1.0
            
            # Apply Latency Parameter
            if command.friction and command.friction.latency_ticks > 0:
                params["execution_delay"] = command.friction.latency_ticks
                
            # Flatten intent to string for engine
            action_str = command.intent.primary_pattern.upper() 
            
            instructions.append(EngineInstruction(
                instruction_id=str(uuid.uuid4()),
                unit_id=uid,
                action=action_str,
                parameters=params,
                cost_deducted=0 # Costs are dead.
            ))
            
        return instructions

    @staticmethod
    def process_turn(current_state: GameState, instructions: List[EngineInstruction]) -> TurnResult:
        """
        Advances the simulation by ONE TICK.
        Generates Narrative Events (SitRep).
        """
        new_turn_count = current_state.turn_count + 1
        events = []
        visual_updates = {}
        
        # Clone state
        new_units = [u.model_copy() for u in current_state.player_units]
        
        # 1. Process Instructions (Movement & Combat)
        for instr in instructions:
            unit = next((u for u in new_units if u.unit_id == instr.unit_id), None)
            if not unit: continue

            if instr.action == "HOLD":
                events.append(f"Unit {unit.unit_id[-4:]} holding position. ({instr.parameters.get('reason', 'Waiting')})")
                continue

            # Movement Logic
            if "target_pos" in instr.parameters:
                 target = instr.parameters["target_pos"]
                 speed = instr.parameters.get("speed", 5.0) 
                 
                 # Vector Math
                 dx = target["x"] - unit.position["x"]
                 dz = target["z"] - unit.position["z"]
                 dist = (dx**2 + dz**2)**0.5
                 
                 if dist <= speed:
                     unit.position = target
                     events.append(f"Unit {unit.unit_id[-4:]} arrived at sector {int(target['x'])//10}-{int(target['z'])//10}.")
                 else:
                     ratio = speed / dist
                     unit.position = {
                         "x": unit.position["x"] + dx * ratio,
                         "z": unit.position["z"] + dz * ratio
                     }
                     # events.append(f"Unit {unit.unit_id} moving...") # Too noisy for SitRep

        # 2. Event Generation (The Narrative Engine)
        # Check for Flanking / Encirclement / Morale
        
        # Mock Logic: If units are too spread out, morale drops
        if len(new_units) > 1:
            u1 = new_units[0]
            # Simple distance check for cohesion
            # ... (omitted for brevity, just random flavor)
            pass

        # Random Flavor Events (to test Event-Driven Mode)
        import random
        if random.random() < 0.1:
            events.append("Signal intercept: Enemy movement in Sector 7.")
            visual_updates["highlight_sectors"] = [7]
            
        if random.random() < 0.05:
            target_u = random.choice(new_units)
            target_u.morale = max(0, target_u.morale - 10)
            target_u.tags.append("suppressed")
            events.append(f"Unit {target_u.unit_id[-4:]} taking heavy fire! Morale dropping.")

        # Check Win/Loss conditions
        game_over = False
        if current_state.general_status == "DEAD":
            events.append("CRITICAL: Enemy General eliminated.")
            game_over = True

        new_state = current_state.model_copy(update={
            "turn_count": new_turn_count,
            "player_units": new_units
        })

        return TurnResult(
            turn_id=new_turn_count,
            instructions=instructions,
            state_delta=visual_updates,
            events=events,
            game_over=game_over,
            new_snapshot=new_state
        )
