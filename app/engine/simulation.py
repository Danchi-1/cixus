import uuid
import random
from typing import List
from app.engine.types import GameState, GameCommand, EngineInstruction, TurnResult
from app.models.player import Player


# ── Damage tables — (min, max) HP dealt per turn ──────────────────────────────
_PLAYER_DAMAGE = {
    "sacrificial_charge":    (80, 160),
    "blitzkrieg_shock":      (50, 100),
    "assault":               (40,  90),
    "ambush":                (35,  80),
    "encirclement":          (30,  70),
    "flank":                 (35,  75),
    "deception_feint":       (20,  55),
    "siege_attrition":       (25,  50),
    "psychological_terror":  (10,  30),
    "phalanx_defense":       (10,  25),
    "strategic_withdrawal":  ( 0,   5),   # retreating — minimal offense
    "movement":              (20,  45),   # generic
}
_ENEMY_BASE_DAMAGE = {
    "phalanx_defense":       ( 8,  18),   # dug-in — enemy slowed
    "strategic_withdrawal":  (25,  55),   # retreating units get hit hard
    "sacrificial_charge":    (30,  70),   # mutual carnage
}
_ENEMY_DEFAULT_DAMAGE = (15, 35)


def _pattern(instructions: List[EngineInstruction]) -> str:
    """Return the first instruction's action normalised to lowercase."""
    return instructions[0].action.lower() if instructions else "movement"


def _closest_damage_key(pattern: str) -> str:
    """Map a raw pattern string to the nearest damage table key."""
    for key in _PLAYER_DAMAGE:
        if key in pattern or pattern in key:
            return key
    if any(w in pattern for w in ("attack", "charge", "flank", "assault")):
        return "assault"
    if any(w in pattern for w in ("defend", "hold", "fortif", "dig")):
        return "phalanx_defense"
    if any(w in pattern for w in ("withdraw", "retreat", "fall")):
        return "strategic_withdrawal"
    return "movement"


class SimulationEngine:

    @staticmethod
    def validate_and_clamp(
        command: GameCommand, player: Player, state: GameState
    ) -> List[EngineInstruction]:
        """
        Safety valve / friction layer.
        Returns instructions with optional refusal or latency applied.
        """
        instructions = []

        if command.friction and command.friction.refusal_chance > 0:
            if random.random() < command.friction.refusal_chance:
                for uid in command.target_unit_ids:
                    instructions.append(EngineInstruction(
                        instruction_id=str(uuid.uuid4()),
                        unit_id=uid,
                        action="HOLD",
                        parameters={"reason": command.friction.message or "SIGNAL_LOST"},
                        cost_deducted=0
                    ))
                return instructions

        for uid in command.target_unit_ids:
            params: dict = {}
            if command.destination:
                params["target_pos"] = command.destination
                params["speed"] = 1.0
            if command.friction and command.friction.latency_ticks > 0:
                params["execution_delay"] = command.friction.latency_ticks

            action_str = command.intent.primary_pattern.upper()
            instructions.append(EngineInstruction(
                instruction_id=str(uuid.uuid4()),
                unit_id=uid,
                action=action_str,
                parameters=params,
                cost_deducted=0
            ))

        return instructions

    @staticmethod
    def process_turn(
        current_state: GameState,
        instructions: List[EngineInstruction],
        player_authority: int = 70,
    ) -> TurnResult:
        """
        Advances the simulation by ONE TICK.

        Changes from previous version
        ─────────────────────────────
        • Player units AND enemy units are deep-copied and mutated.
        • Damage is calculated each turn based on command pattern + authority.
        • Enemy counterattacks every turn (pressure scales with turn number).
        • Win  → warlord health ≤ 0  (general_status set to DEAD)
        • Loss → commander health ≤ 0
        """
        new_turn = current_state.turn_count + 1
        events: list[str] = []
        visual_updates: dict = {}

        # Deep-copy both sides ────────────────────────────────────────────────
        new_player_units = [u.model_copy() for u in current_state.player_units]
        new_enemy_units  = [u.model_copy() for u in current_state.enemy_units]

        # ── 1. Movement (unchanged) ───────────────────────────────────────────
        for instr in instructions:
            unit = next((u for u in new_player_units if u.unit_id == instr.unit_id), None)
            if not unit:
                continue
            if instr.action == "HOLD":
                events.append(f"Unit {unit.unit_id[-4:]} holding position.")
                continue
            if "target_pos" in instr.parameters:
                target = instr.parameters["target_pos"]
                speed  = instr.parameters.get("speed", 5.0)
                dx = target["x"] - unit.position["x"]
                dz = target["z"] - unit.position["z"]
                dist = (dx ** 2 + dz ** 2) ** 0.5
                if dist <= speed:
                    unit.position = target
                else:
                    ratio = speed / dist
                    unit.position = {
                        "x": unit.position["x"] + dx * ratio,
                        "z": unit.position["z"] + dz * ratio,
                    }

        # ── 2. Combat setup ───────────────────────────────────────────────────
        living_enemies = [u for u in new_enemy_units  if u.status != "DEAD"]
        living_players = [u for u in new_player_units if u.status != "DEAD"]

        pattern    = _pattern(instructions)
        dmg_key    = _closest_damage_key(pattern)
        is_retreat = dmg_key == "strategic_withdrawal"
        is_sacrificial = "sacrificial" in pattern

        # Authority modifier: 0.6 at AP=20, 1.0 at AP=100
        auth_mod = 0.6 + (max(0, min(100, player_authority) - 20) / 200)

        # ── 3. Player strikes enemy ───────────────────────────────────────────
        if living_enemies and not is_retreat:
            base_min, base_max = _PLAYER_DAMAGE.get(dmg_key, _PLAYER_DAMAGE["movement"])
            raw_dmg  = random.randint(base_min, base_max)
            final_dmg = int(raw_dmg * auth_mod * (0.7 + random.random() * 0.6))

            # Prefer warlord / boss as primary target
            target_enemy = next(
                (u for u in living_enemies
                 if "BOSS" in (u.tags or []) or u.type == "WARLORD"),
                None,
            )
            if not target_enemy:
                # Otherwise hit the closest (lowest z = closest to player lines)
                target_enemy = min(living_enemies, key=lambda u: u.position.get("z", 0))

            target_enemy.health = max(0.0, target_enemy.health - final_dmg)
            if target_enemy.health <= 0:
                target_enemy.status = "DEAD"
                events.append(
                    f"⚡ {target_enemy.type} [{target_enemy.unit_id[-6:]}] ELIMINATED — {final_dmg} dmg"
                )
            else:
                events.append(
                    f"Strike on {target_enemy.type}: -{final_dmg} HP "
                    f"(remaining: {int(target_enemy.health)})"
                )

        # ── 4. Enemy counterattack ────────────────────────────────────────────
        if living_players:
            # Pressure ramps as war drags on
            turn_pressure = min(1.6, 0.5 + new_turn * 0.028)

            e_min, e_max = _ENEMY_BASE_DAMAGE.get(
                dmg_key, _ENEMY_DEFAULT_DAMAGE
            )
            enemy_dmg = int(
                random.randint(e_min, e_max) * turn_pressure * (0.7 + random.random() * 0.6)
            )

            # Never target the commander until everyone else is gone
            non_commander = [
                u for u in living_players
                if "COMMANDER" not in (u.tags or []) and u.type != "COMMANDER"
            ]
            target_player = non_commander[0] if non_commander else living_players[0]

            target_player.health = max(0.0, target_player.health - enemy_dmg)
            if target_player.health <= 0:
                target_player.status = "DEAD"
                events.append(
                    f"💀 {target_player.type} [{target_player.unit_id[-6:]}] DESTROYED — {enemy_dmg} dmg"
                )
            else:
                events.append(
                    f"Enemy pressure on {target_player.type}: -{enemy_dmg} HP "
                    f"(remaining: {int(target_player.health)})"
                )

        # ── 5. Sacrificial charge — player also bleeds ────────────────────────
        if is_sacrificial:
            living_non_cmd = [
                u for u in new_player_units
                if u.status != "DEAD" and u.type != "COMMANDER"
            ]
            if living_non_cmd:
                sacrifice_target = random.choice(living_non_cmd)
                s_dmg = random.randint(50, 130)
                sacrifice_target.health = max(0.0, sacrifice_target.health - s_dmg)
                if sacrifice_target.health <= 0:
                    sacrifice_target.status = "DEAD"
                events.append(
                    f"SACRIFICE: {sacrifice_target.unit_id[-6:]} takes {s_dmg} to hold the line."
                )

        # ── 6. Occasional random flavour ─────────────────────────────────────
        if random.random() < 0.08:
            events.append("Signal intercept: Enemy flanking movement detected.")
            visual_updates["highlight_sectors"] = [7]

        # ── 7. Win / Loss check ───────────────────────────────────────────────
        warlord_dead = any(
            u.status == "DEAD"
            and ("BOSS" in (u.tags or []) or u.type == "WARLORD")
            for u in new_enemy_units
        )
        commander_dead = any(
            u.status == "DEAD"
            and ("COMMANDER" in (u.tags or []) or u.type == "COMMANDER")
            for u in new_player_units
        )
        game_over    = warlord_dead or commander_dead
        new_gen_stat = "DEAD" if warlord_dead else current_state.general_status

        if warlord_dead:
            events.append("★ WARLORD ELIMINATED — Engagement over.")
        if commander_dead:
            events.append("✖ COMMANDER LOST — Operation failed.")

        new_state = current_state.model_copy(update={
            "turn_count":    new_turn,
            "player_units":  new_player_units,
            "enemy_units":   new_enemy_units,
            "general_status": new_gen_stat,
        })

        return TurnResult(
            turn_id=new_turn,
            instructions=instructions,
            state_delta=visual_updates,
            events=events,
            game_over=game_over,
            new_snapshot=new_state,
        )
