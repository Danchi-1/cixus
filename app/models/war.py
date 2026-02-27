from sqlalchemy import String, Integer, JSON, DateTime, Uuid, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import uuid
from datetime import datetime
from app.db.base import Base

class WarSession(Base):
    __tablename__ = "war_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("players.id"))
    
    status: Mapped[str] = mapped_column(String, default="ACTIVE") # ACTIVE, PAUSED, ENDED
    turn_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Game State Persistence
    # Stores the authoritative snapshot of the entire battlefield (units, positions, health)
    current_state_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    
    # AI Context
    history_summary: Mapped[str] = mapped_column(String, default="") # RAG context for AI
    last_judgment_context: Mapped[dict] = mapped_column(JSON, default=dict, nullable=True) # Summary of recent history for Prompting
    last_regen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True) # For 24h cycle
    
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_command_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    player = relationship("Player", back_populates="wars")
    general = relationship("General", back_populates="war", uselist=False)
    actions = relationship("ActionLog", back_populates="war")
    authority_logs = relationship("AuthorityLog", back_populates="war", cascade="all, delete-orphan")
    sitreps = relationship("SitRepLog", back_populates="war", cascade="all, delete-orphan")
