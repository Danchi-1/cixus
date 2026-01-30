import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def test_connection():
    # Construct URL manually to be sure
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "password")
    server = os.getenv("POSTGRES_SERVER", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db_name = os.getenv("POSTGRES_DB", "cixus_rage")
    
    url = f"postgresql+asyncpg://{user}:{password}@{server}:{port}/{db_name}"
    print(f"Testing connection to: postgresql+asyncpg://{user}:****@{server}:{port}/{db_name}")
    
    try:
        engine = create_async_engine(url)
        async with engine.connect() as conn:
            print("✅ Connection Successful!")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
