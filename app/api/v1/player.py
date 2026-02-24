from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional
from pydantic import BaseModel
from app.db.base import get_db
from app.models.player import Player
from app.services.ai.narrator import narrator
import random

router = APIRouter()


def get_client_ip(request: Request) -> str:
    """
    Extract the real client IP — handles proxies (Vercel, Railway, Nginx, Cloudflare).
    Priority: X-Forwarded-For → CF-Connecting-IP → X-Real-IP → direct socket.
    Also normalises IPv4-mapped IPv6 (::ffff:x.x.x.x → x.x.x.x) and strips ports.
    """
    raw = None

    # Cloudflare always sets this — most reliable on CF-proxied deployments
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        raw = cf_ip.strip()

    if not raw:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Comma-separated list; first entry is the original client
            raw = forwarded_for.split(",")[0].strip()

    if not raw:
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            raw = real_ip.strip()

    if not raw:
        raw = request.client.host if request.client else "unknown"

    # Strip port if present (e.g. "1.2.3.4:54321" → "1.2.3.4")
    if raw and "." in raw and ":" in raw:
        raw = raw.rsplit(":", 1)[0]

    # Normalise IPv4-mapped IPv6  (::ffff:1.2.3.4 → 1.2.3.4)
    if raw and raw.lower().startswith("::ffff:"):
        raw = raw[7:]

    return raw or "unknown"


def generate_commander_name() -> str:
    """Generate a unique military-style commander callsign."""
    adjectives = [
        "IRON", "GHOST", "SHADOW", "CRIMSON", "SILENT",
        "STEEL", "DARK", "VOID", "FALLEN", "OBSIDIAN",
        "BROKEN", "HOLLOW", "WRATH", "ASHEN", "BITTER",
        "COLD", "BLEAK", "GRIM", "SABLE", "DUSK",
    ]
    nouns = [
        "HAND", "WOLF", "BLADE", "CROW", "VEIL",
        "LANCE", "SHARD", "FANG", "SHIELD", "PYRE",
        "STORM", "TIDE", "RIDGE", "MARK", "DIRGE",
        "SPEAR", "GRAVE", "FLANK", "PIKE", "RUIN",
    ]
    suffix = random.randint(10, 99)
    return f"{random.choice(adjectives)}-{random.choice(nouns)}-{suffix}"


# ── Request schema ─────────────────────────────────────────────────────────────

class IdentifyRequest(BaseModel):
    player_id: Optional[str] = None   # UUID string stored in browser localStorage


# ── IP-based login/register (primary endpoint) ────────────────────────────────

@router.post("/identify", response_model=dict)
async def identify_player(request: Request, body: IdentifyRequest = IdentifyRequest(), db: AsyncSession = Depends(get_db)):
    """
    Multi-layer identity resolution — most reliable first:
      1. player_id from localStorage (survives IP changes, VPN, DHCP churn)
      2. ip_address lookup (fallback when no stored ID)
      3. Create new player if neither matches

    The client SHOULD always send its stored player_id from localStorage so that
    returning sessions survive IP changes. The IP is still stored/updated for
    future fallback.
    """
    try:
        ip = get_client_ip(request)
        print(f"[identify] request from ip={ip!r}  stored_player_id={body.player_id!r}")

        # ── 1. Lookup by stored player_id (primary — survives IP changes) ─────
        if body.player_id:
            try:
                uid = UUID(body.player_id)
                existing = await db.get(Player, uid)
                if existing:
                    # Update IP tracking
                    existing.last_seen_ip = ip
                    if not existing.ip_address:
                        # First time we have an IP for this player — store it
                        existing.ip_address = ip
                    await db.commit()
                    print(f"[identify] Found by player_id → {existing.username}")
                    return _player_response(existing, returning=True)
            except (ValueError, Exception) as e:
                print(f"[identify] player_id lookup failed: {e}")
                # Fall through to IP lookup

        # ── 2. Lookup by IP address ───────────────────────────────────────────
        if ip and ip != "unknown":
            result = await db.execute(select(Player).where(Player.ip_address == ip))
            existing = result.scalars().first()
            if existing:
                existing.last_seen_ip = ip
                await db.commit()
                print(f"[identify] Found by IP → {existing.username}")
                return _player_response(existing, returning=True)

        # ── 3. New player — generate callsign ─────────────────────────────────
        username = generate_commander_name()
        for _ in range(10):
            name_taken = await db.execute(select(Player).where(Player.username == username))
            if not name_taken.scalars().first():
                break
            username = generate_commander_name()

        new_player = Player(
            username=username,
            ip_address=ip if ip != "unknown" else None,
            last_seen_ip=ip if ip != "unknown" else None,
            prelude_seen=True,
        )
        db.add(new_player)
        await db.commit()
        await db.refresh(new_player)
        print(f"[identify] Created new player → {new_player.username} (ip={ip})")

        prelude_content = await narrator.generate_prelude(new_player.username)

        return _player_response(new_player, returning=False, prelude=prelude_content)

    except Exception as e:
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Identity resolution failed: {str(e)}")


def _player_response(player: Player, returning: bool, prelude=None) -> dict:
    """Shared response schema for both returning and new players."""
    return {
        "id": str(player.id),
        "username": player.username,
        "authority_level": player.authority_level,
        "authority_points": player.authority_points,
        "reputation": player.reputation or {},
        "leadership_profile": player.leadership_profile or {},
        "returning": returning,
        "prelude": prelude if prelude else {"skipped": True, "reason": "Returning Commander"} if returning else {},
        # Debug field — remove in production if desired
        "_debug_ip": player.ip_address,
    }


# ── Debug endpoint (optional — shows what IP the server detects) ──────────────
@router.get("/whoami")
async def whoami(request: Request):
    """Dev/debug endpoint: returns the IP the server detects for this client."""
    ip = get_client_ip(request)
    return {
        "detected_ip": ip,
        "headers": {
            "X-Forwarded-For": request.headers.get("X-Forwarded-For"),
            "X-Real-IP": request.headers.get("X-Real-IP"),
            "CF-Connecting-IP": request.headers.get("CF-Connecting-IP"),
            "direct": request.client.host if request.client else None,
        }
    }


# ── Legacy / direct player lookup ────────────────────────────────────────────

@router.post("/", response_model=dict)
async def create_player(request: Request, db: AsyncSession = Depends(get_db)):
    """Legacy endpoint — now redirects to IP-based identify."""
    return await identify_player(request, db=db)


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
