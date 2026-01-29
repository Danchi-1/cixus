import asyncio
from app.db.base import engine, Base
from app.models import player, war, general, action

async def init_models():
    async with engine.begin() as conn:
        print("Creating tables...")
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created.")

if __name__ == "__main__":
    asyncio.run(init_models())
