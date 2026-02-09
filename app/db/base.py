from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# SQLite compatibility: CheckForSameThread=False
connect_args = {}
if "sqlite" in settings.async_database_url:
    connect_args = {"check_same_thread": False}

from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in str(dbapi_connection): # Basic check
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

# Create Async Engine
engine = create_async_engine(
    settings.async_database_url, 
    echo=False,
    connect_args=connect_args
)

# Session Factory
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with SessionLocal() as session:
        yield session

# Import models to ensure they are registered with Base.metadata
# This prevents "mapper failed to initialize" errors
from app.models.player import Player
from app.models.war import WarSession
from app.models.action import ActionLog
from app.models.authority import AuthorityLog
from app.models.general import General
from app.models.sitrep import SitRepLog
