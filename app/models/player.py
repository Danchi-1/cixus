from sqlalchemy import String, Integer, JSON, DateTime, Uuid, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional
import uuid
from datetime import datetime
from app.db.base import Base

class Player(Base):
    __tablename__ = "players"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)

    # IP-based identity — primary auth mechanism
    ip_address: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True, nullable=True)
    last_seen_ip: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # tracks if IP changed
    
    # Authority System
    authority_level: Mapped[int] = mapped_column(Integer, default=1)
    authority_points: Mapped[int] = mapped_column(Integer, default=100)
    
    # AI State
    prelude_seen: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Meta-Intelligence Profile
    reputation: Mapped[dict] = mapped_column(JSON, default=dict) # e.g. {"Ruthless": 0.5, "Hesitant": 0.1}
    
    # Emergent Leadership Arc
    leadership_profile: Mapped[dict] = mapped_column(JSON, default={})
    # Structure: {"archetype": "Unknown", "trends": [], "inertia": 0.5}
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    wars = relationship("WarSession", back_populates="player")
