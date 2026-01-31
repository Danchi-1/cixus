from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cixus Rage Backend"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "cixus_rage"
    DATABASE_URL: str | None = None

    # AI Keys (Mocked for now if empty)
    OPENAI_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    
    # Security
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    
    class Config:
        env_file = ".env"

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        # Default to SQLite for easy deployment/local use
        return "sqlite+aiosqlite:///./cixus.db"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
