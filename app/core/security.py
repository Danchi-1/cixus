from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date
from app.db.base import get_db
from app.models.quota import UsageQuota

# Config
DAILY_REQUEST_LIMIT = 50 # Strict limit for MVP to save API keys

async def check_rate_limit(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Dependency to enforce daily quotas based on Client IP.
    """
    client_ip = request.client.host
    today = date.today()
    
    # Check DB
    result = await db.execute(
        select(UsageQuota).where(
            UsageQuota.identifier == client_ip,
            UsageQuota.date == today # In real generic logic, cast to date
        )
    )
    quota = result.scalars().first()
    
    if not quota:
        # Create new quota record
        quota = UsageQuota(identifier=client_ip, date=today, request_count=1)
        db.add(quota)
        await db.commit()
        return True
    
    if quota.request_count >= DAILY_REQUEST_LIMIT:
        raise HTTPException(
            status_code=429, 
            detail=f"Daily simulation limit reached ({DAILY_REQUEST_LIMIT}). Come back tomorrow, Commander."
        )
    
    # Increment
    quota.request_count += 1
    await db.commit()
    return True
