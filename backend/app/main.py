from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.api.routes import scan, auth, history, petition


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title="TrustLens AI",
    description="7 katmanlı e-ticaret güven asistanı",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(scan.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(petition.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "TrustLens AI"}
