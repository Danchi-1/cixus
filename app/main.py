from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import war, player
from app.db.base import engine, Base
import uuid

# Import Models explicitly to register them with Base.metadata
# This fixes the circular import issue in app/db/base.py
from app.models import player as player_model
from app.models import war as war_model
from app.models import action as action_model
from app.models import authority as authority_model
from app.models import general as general_model
from app.models import sitrep as sitrep_model

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist (No drop logic here, only create)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Database initialization failed: {e}")
    yield

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)

# CORS Configuration
# Allow all origins for debugging
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(player.router, prefix=f"{settings.API_V1_STR}/players", tags=["players"])
app.include_router(war.router, prefix=f"{settings.API_V1_STR}/war", tags=["war"])

@app.get("/")
async def root():
    return {"message": "Cixus Rage Backend Online", "status": "Ready for War"}

from sqlalchemy import text
@app.get("/debug-db")
async def debug_db():
    try:
        async with engine.connect() as conn:
            # Check connection
            await conn.execute(text("SELECT 1"))
            # Check tables
            tables = await conn.run_sync(lambda sync_conn: sync_conn.dialect.get_table_names(sync_conn))
            return {
                "status": "connected", 
                "database_url_masked": settings.async_database_url.split("@")[-1] if "@" in settings.async_database_url else "sqlite",
                "tables": tables
            }
    except Exception as e:
        return {"status": "error", "message": str(e), "type": type(e).__name__}

from app.db.base import get_db
from fastapi import Depends
@app.get("/debug-dependency")
async def debug_dependency(db: any = Depends(get_db)):
    return {"status": "dependency_ok", "session_type": str(type(db))}

@app.get("/backup-db")
async def backup_db(db: AsyncSession = Depends(get_db)):
    """Export all database data as JSON for backup purposes"""
    try:
        from app.models.player import Player
        from app.models.war import WarSession
        from app.models.action import Action
        from app.models.authority import AuthorityRecord
        from app.models.general import General
        from app.models.sitrep import SituationReport
        from sqlalchemy import select
        import json
        from datetime import datetime
        
        backup_data = {
            "backup_timestamp": datetime.utcnow().isoformat(),
            "tables": {}
        }
        
        # Helper to serialize model instances
        def serialize_model(obj):
            data = {}
            for column in obj.__table__.columns:
                value = getattr(obj, column.name)
                # Handle UUID, datetime, and other non-serializable types
                if hasattr(value, 'isoformat'):
                    data[column.name] = value.isoformat()
                elif isinstance(value, uuid.UUID):
                    data[column.name] = str(value)
                else:
                    data[column.name] = value
            return data
        
        # Export Players
        result = await db.execute(select(Player))
        players = result.scalars().all()
        backup_data["tables"]["players"] = [serialize_model(p) for p in players]
        
        # Export Wars
        result = await db.execute(select(WarSession))
        wars = result.scalars().all()
        backup_data["tables"]["wars"] = [serialize_model(w) for w in wars]
        
        # Export Actions
        result = await db.execute(select(Action))
        actions = result.scalars().all()
        backup_data["tables"]["actions"] = [serialize_model(a) for a in actions]
        
        # Export Authority Records
        result = await db.execute(select(AuthorityRecord))
        auth_records = result.scalars().all()
        backup_data["tables"]["authority_records"] = [serialize_model(ar) for ar in auth_records]
        
        # Export Generals
        result = await db.execute(select(General))
        generals = result.scalars().all()
        backup_data["tables"]["generals"] = [serialize_model(g) for g in generals]
        
        # Export Situation Reports
        result = await db.execute(select(SituationReport))
        sitreps = result.scalars().all()
        backup_data["tables"]["sitreps"] = [serialize_model(s) for s in sitreps]
        
        backup_data["summary"] = {
            "total_players": len(backup_data["tables"]["players"]),
            "total_wars": len(backup_data["tables"]["wars"]),
            "total_actions": len(backup_data["tables"]["actions"]),
            "total_authority_records": len(backup_data["tables"]["authority_records"]),
            "total_generals": len(backup_data["tables"]["generals"]),
            "total_sitreps": len(backup_data["tables"]["sitreps"])
        }
        
        return backup_data
        
    except Exception as e:
        return {"status": "error", "message": str(e), "type": type(e).__name__}

@app.get("/reset-db")
async def reset_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
            
        async with engine.connect() as check_conn:
            tables = await check_conn.run_sync(lambda sync_conn: sync_conn.dialect.get_table_names(sync_conn))
            
        return {"status": "success", "message": "Database reset complete. Schema updated.", "tables_created": tables}
    except Exception as e:
        return {"status": "error", "message": str(e)}
