from sqlalchemy import String, Integer, DateTime, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
import uuid
from datetime import datetime, date
from app.db.base import Base

class UsageQuota(Base):
    """
    Tracks daily usage for a specific "owner" (IP address or Player ID).
    """
    __tablename__ = "usage_quotas"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    identifier: Mapped[str] = mapped_column(String, index=True) # IP-Address or PlayerID
    date: Mapped[date] = mapped_column(DateTime(timezone=True), default=func.current_date())
    
    request_count: Mapped[int] = mapped_column(Integer, default=0)
    llm_tokens_used: Mapped[int] = mapped_column(Integer, default=0) # Optional complexity tracking
    
    last_request: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
