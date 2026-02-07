from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import war, player
from app.db.base import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist (No drop logic here, only create)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://cixus.vercel.app",
    "https://cixus.vercel.app/",
]

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
