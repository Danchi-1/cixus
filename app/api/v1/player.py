from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel
from app.db.base import get_db
from app.models.player import Player
from app.services.ai.narrator import narrator
import random

router = APIRouter()


def get_client_ip(request: Request) -> str:
    """Extract real client IP — handles proxies (Vercel, Railway, Nginx)."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can be a comma-separated list; first entry is the real client
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host


def generate_commander_name() -> str:
    """Generate a unique military-style commander callsign."""
    adjectives = [
        "IRON", "GHOST", "SHADOW", "CRIMSON", "SILENT",
        "STEEL", "DARK", "VOID", "FALLEN", "OBSIDIAN",
        "BROKEN", "HOLLOW", "WRATH", "ASHEN", "BITTER"
    ]
    nouns = [
        "HAND", "WOLF", "BLADE", "CROW", "VEIL",
        "LANCE", "SHARD", "FANG", "SHIELD", "PYRE",
        "STORM", "TIDE", "RIDGE", "MARK", "DIRGE"
    ]
    suffix = random.randint(10, 99)
    return f"{random.choice(adjectives)}-{random.choice(nouns)}-{suffix}"


# ── IP-based login/register (primary endpoint) ────────────────────────────────

@router.post("/identify", response_model=dict)
async def identify_player(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Pure IP-based auth:
    - If a player with this IP exists → return their profile (login).
    - If not → create a new player with an auto-generated callsign (register).
    No username or password required.
    """
    try:
        ip = get_client_ip(request)

        # ── 1. Look up by IP ──────────────────────────────────────────────────
        result = await db.execute(select(Player).where(Player.ip_address == ip))
        existing = result.scalars().first()

        if existing:
            existing.last_seen_ip = ip
            await db.commit()
            return {
                "id": str(existing.id),
                "username": existing.username,
                "authority_level": existing.authority_level,
                "authority_points": existing.authority_points,
                "reputation": existing.reputation or {},
                "leadership_profile": existing.leadership_profile or {},
                "returning": True,
                "prelude": {"skipped": True, "reason": "Returning Commander"},
            }


        # ── 2. New player — generate callsign ────────────────────────────────
        # Ensure generated name is unique (retry on collision)
        username = generate_commander_name()
        for _ in range(10):
            name_taken = await db.execute(select(Player).where(Player.username == username))
            if not name_taken.scalars().first():
                break
            username = generate_commander_name()

        new_player = Player(
            username=username,
            ip_address=ip,
            last_seen_ip=ip,
            prelude_seen=True,
        )
        db.add(new_player)
        await db.commit()
        await db.refresh(new_player)

        prelude_content = await narrator.generate_prelude(new_player.username)

        return {
            "id": str(new_player.id),
            "username": new_player.username,
            "authority_level": new_player.authority_level,
            "authority_points": new_player.authority_points,
            "reputation": new_player.reputation or {},
            "leadership_profile": new_player.leadership_profile or {},
            "returning": False,
            "prelude": prelude_content,
        }


    except Exception as e:
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Identity resolution failed: {str(e)}")


# ── Legacy / direct player lookup (kept for war session use) ──────────────────

@router.post("/", response_model=dict)
async def create_player(request: Request, db: AsyncSession = Depends(get_db)):
    """Legacy endpoint — now redirects to IP-based identify."""
    return await identify_player(request, db)


@router.get("/{player_id}", response_model=dict)
async def get_player(player_id: UUID, db: AsyncSession = Depends(get_db)):
    player = await db.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return {
        "id": str(player.id),
        "username": player.username,
        "authority_level": player.authority_level,
        "authority_points": player.authority_points,
        "reputation": player.reputation,
        "ip_address": player.ip_address,
    }
