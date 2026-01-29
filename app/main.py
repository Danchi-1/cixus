from fastapi import FastAPI
from app.core.config import settings
from app.api.v1 import war, player

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# Include Routers
app.include_router(player.router, prefix=f"{settings.API_V1_STR}/players", tags=["players"])
app.include_router(war.router, prefix=f"{settings.API_V1_STR}/war", tags=["war"])

@app.get("/")
async def root():
    return {"message": "Cixus Rage Backend Online", "status": "Ready for War"}
