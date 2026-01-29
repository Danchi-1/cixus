from sqlalchemy import String, Integer, JSON, Uuid, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
from app.db.base import Base

class General(Base):
    __tablename__ = "generals"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    war_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("war_sessions.id"))
    
    name: Mapped[str] = mapped_column(String)
    
    # Personality & Difficulty
    traits: Mapped[list[str]] = mapped_column(JSON, default=list) # e.g. ["Paranoid", "Defensive"]
    difficulty_tier: Mapped[int] = mapped_column(Integer, default=1)
    
    # Status
    status: Mapped[str] = mapped_column(String, default="ALIVE") # ALIVE, RETREATING, DEAD
    
    # Learning
    adaptation_log: Mapped[dict] = mapped_column(JSON, default=dict) # Notes on how to kill the player
    
    war = relationship("WarSession", back_populates="general")
