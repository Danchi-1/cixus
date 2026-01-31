import asyncio
from app.db.base import engine, Base
# Import all models to ensure they are registered with Base metadata
from app.models.player import Player
from app.models.war import WarSession
from app.models.action import ActionLog
from app.models.general import General
from app.models.authority import AuthorityLog

async def init_models():
    async with engine.begin() as conn:
        # For dev: Drop all tables to apply schema changes (optional, be careful)
        # await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database Initialized with new schema.")

if __name__ == "__main__":
    asyncio.run(init_models())
