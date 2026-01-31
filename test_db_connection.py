import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from dotenv import load_dotenv

load_dotenv()

async def test_connection():
    url = settings.async_database_url
    # Mask password for printing
    safe_url = url.split("@")[-1]
    print(f"Testing connection to: ...@{safe_url}")
    
    try:
        engine = create_async_engine(url)
        async with engine.connect() as conn:
            print("✅ Connection Successful!")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
