from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from pydantic import BaseModel
from app.db.base import get_db
from app.models.player import Player
from app.services.ai.narrator import narrator

router = APIRouter()

class CreatePlayerRequest(BaseModel):
    username: str

@router.post("/", response_model=dict)
async def create_player(req: CreatePlayerRequest, db: AsyncSession = Depends(get_db)):
    # Check if exists
    from sqlalchemy import select
    result = await db.execute(select(Player).where(Player.username == req.username))
    existing_player = result.scalars().first()
    
    if existing_player:
        return {
            "id": existing_player.id, 
            "username": existing_player.username, 
            "authority": existing_player.authority_level,
            "prelude": {"skipped": True, "reason": "Returning Commander"}
        }
    
    try:
        new_player = Player(username=req.username, prelude_seen=True)
        db.add(new_player)
        await db.commit()
        await db.refresh(new_player) # Ensure we get the ID back
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create player: {str(e)}")
    
    # Trigger Prelude
    prelude_content = await narrator.generate_prelude(new_player.username)
    
    return {
        "id": new_player.id, 
        "username": new_player.username, 
        "authority": new_player.authority_level,
        "prelude": prelude_content
    }

@router.get("/{player_id}", response_model=dict)
async def get_player(player_id: UUID, db: AsyncSession = Depends(get_db)):
    player = await db.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    return {
        "id": player_id,
        "username": player.username,
        "authority_level": player.authority_level,
        "authority_points": player.authority_points,
        "reputation": player.reputation
    }
