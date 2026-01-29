import uuid
from typing import List
from app.engine.types import GameState, GameCommand, EngineInstruction, TurnResult, ActionType
from app.models.player import Player

AUTHORITY_COSTS = {
    ActionType.MOVE: 5,
    ActionType.ATTACK: 10,
    ActionType.FLANK: 20, # Expensive, requires coordination
    ActionType.RETREAT: 50, # Massive cost to authority/morale
    ActionType.HOLD: 2
}

class SimulationEngine:
    @staticmethod
    def validate_and_clamp(command: GameCommand, player: Player, state: GameState) -> List[EngineInstruction]:
        """
        The Safety Valve.
        1. Checks Authority Cost.
        2. Clamps movement/actions to physics limits.
        3. Returns deterministic instructions.
        """
        instructions = []
        cost = AUTHORITY_COSTS.get(command.action_type, 10)
        
        # 1. Authority Check
        if player.authority_points < cost:
            # Downgrade logic could go here, for now just fail or HOLD
            # "Soldiers are confused, they hold position."
            for uid in command.target_unit_ids:
                instructions.append(EngineInstruction(
                    instruction_id=str(uuid.uuid4()),
                    unit_id=uid,
                    action=ActionType.HOLD,
                    parameters={"reason": "INSUFFICIENT_AUTHORITY"},
                    cost_deducted=0
                ))
            return instructions

        # 2. Process Valid Command
        # This is where we would do physics clamping (e.g. max_speed check)
        # For MVP, we assume the command is mostly valid but we generate the rigorous instruction
        
        for uid in command.target_unit_ids:
            # Mock physics: Unit can only move 10 units per turn.
            params = {}
            if command.destination:
                # Calculate distance, clamp if > 10
                # (Pseudocode for MVP simplification)
                params["target_pos"] = command.destination
                params["speed"] = 1.0
            
            instructions.append(EngineInstruction(
                instruction_id=str(uuid.uuid4()),
                unit_id=uid,
                action=command.action_type,
                parameters=params,
                cost_deducted=cost // len(command.target_unit_ids) # Split cost? Or flat cost? keeping it simple for now
            ))
            
        return instructions

    @staticmethod
    def process_turn(current_state: GameState, instructions: List[EngineInstruction]) -> TurnResult:
        """
        Advances the simulation by ONE TICK.
        """
        new_turn_count = current_state.turn_count + 1
        events = []
        
        # In a real engine, we'd apply physics here.
        # For MVP, we just update the snapshot based on instructions.
        
        # Clone state (simplistic)
        new_units = [u.model_copy() for u in current_state.player_units]
        
        for instr in instructions:
            # Apply instruction effects
            # e.g. Update position
            if instr.action == ActionType.MOVE and "target_pos" in instr.parameters:
                 for u in new_units:
                     if u.unit_id == instr.unit_id:
                         u.position = instr.parameters["target_pos"]
                         events.append(f"Unit {u.unit_id} moving to {u.position}")

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
            state_delta={}, # TODO: Diff logic
            events=events,
            game_over=game_over,
            new_snapshot=new_state
        )
