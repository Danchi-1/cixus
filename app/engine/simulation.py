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
        """
        new_turn_count = current_state.turn_count + 1
        events = []
        
        # Clone state (simplistic)
        new_units = [u.model_copy() for u in current_state.player_units]
        
        for instr in instructions:
            # Apply instruction effects
            # In a real engine, we'd have a physics solver here.
            # For MVP, broad logic:
            
            # Movement Logic
            if "target_pos" in instr.parameters:
                 target = instr.parameters["target_pos"]
                 speed = instr.parameters.get("speed", 5.0) 
                 
                 for u in new_units:
                     if u.unit_id == instr.unit_id:
                         # Calculate vector to target
                         dx = target["x"] - u.position["x"]
                         dz = target["z"] - u.position["z"]
                         dist = (dx**2 + dz**2)**0.5
                         
                         if dist <= speed:
                             u.position = target
                             events.append(f"Unit {u.unit_id} executed {instr.action} to {u.position}")
                         else:
                             ratio = speed / dist
                             u.position = {
                                 "x": u.position["x"] + dx * ratio,
                                 "z": u.position["z"] + dz * ratio
                             }
                             events.append(f"Unit {u.unit_id} executing {instr.action} (Dist: {dist:.1f})")

        # Check Win/Loss conditions
        game_over = False
        if current_state.general_status == "DEAD":
            events.append("Enemy General Evaluated as Dead.")
            game_over = True

        new_state = current_state.model_copy(update={
            "turn_count": new_turn_count,
            "player_units": new_units
        })

        return TurnResult(
            turn_id=new_turn_count,
            instructions=instructions,
            state_delta={},
            events=events,
            game_over=game_over,
            new_snapshot=new_state
        )
