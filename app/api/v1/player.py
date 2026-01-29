from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from pydantic import BaseModel
from app.db.base import get_db
from app.models.player import Player

router = APIRouter()

class CreatePlayerRequest(BaseModel):
    username: str

@router.post("/", response_model=dict)
async def create_player(req: CreatePlayerRequest, db: AsyncSession = Depends(get_db)):
    # Check if exists
    # (Simple logic for MVP)
    existing = False # TODO: query
    
    new_player = Player(username=req.username)
    db.add(new_player)
    await db.commit()
    
    return {"id": new_player.id, "username": new_player.username, "authority": new_player.authority_level}

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
