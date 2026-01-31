import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base import Base

class AuthorityLog(Base):
    __tablename__ = "authority_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    war_id = Column(String, ForeignKey("war_sessions.id"), nullable=False, index=True)
    turn_id = Column(Integer, nullable=False)
    delta = Column(Integer, nullable=False) # e.g. -5, +2
    reason = Column(String, nullable=True) # Cixus explanation
    context_snapshot = Column(JSON, nullable=True) # What Cixus saw (Intent, SitRep)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    war = relationship("WarSession", back_populates="authority_logs")
