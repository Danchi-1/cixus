from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import war, player
from app.db.base import engine, Base

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

@app.get("/reset-db")
async def reset_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        return {"status": "success", "message": "Database reset complete. Schema updated."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
