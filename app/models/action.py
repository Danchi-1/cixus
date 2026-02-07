from sqlalchemy import String, JSON, DateTime, Uuid, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import uuid
from datetime import datetime
from app.db.base import Base

class ActionLog(Base):
    __tablename__ = "action_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    war_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("war_sessions.id"))
    
    # The Command
    player_command_raw: Mapped[str] = mapped_column(String) # "Charge the left flank"
    parsed_action: Mapped[dict] = mapped_column(JSON)       # {"type": "MOVE", "target": "LEFT_WING"}
    
    # Simulation Result
    outcome: Mapped[str] = mapped_column(String, default="PENDING") # SUCCESS, FAILED, INVALID
    state_delta: Mapped[dict] = mapped_column(JSON, nullable=True)  # What actually changed in the engine
    
    # Cixus Judgment
    cixus_evaluation: Mapped[dict | None] = mapped_column(JSON, nullable=True) # {"grade": "A", "msg": "Bold"}
    
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    war = relationship("WarSession", back_populates="actions")
