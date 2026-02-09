from sqlalchemy import String, Integer, JSON, Uuid, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import uuid
from datetime import datetime
from app.db.base import Base

class SitRepLog(Base):
    __tablename__ = "sitrep_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    war_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("war_sessions.id"))
    turn_id: Mapped[int] = mapped_column(Integer)
    
    # Narrative Content
    text_content: Mapped[str] = mapped_column(String) # "Unit Alpha was pinned down..."
    
    # Structured Data for Analytics/UI
    structured_data: Mapped[dict] = mapped_column(JSON, default=dict) 
    # e.g. {"casualties": ["unit_beta"], "events": ["flank_broken"]}
    
    # Visual Context for Map Abstraction
    visual_context: Mapped[dict] = mapped_column(JSON, default=dict)
    # e.g. {"highlight_sectors": [1, 2], "fog_update": "sector_4_cleared"}
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    war = relationship("WarSession", back_populates="sitreps")
