"""
UntoldMoney API — FastAPI application entry point.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import get_logger, setup_logging

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    setup_logging()
    logger.info(
        "app_starting",
        app_name=settings.APP_NAME,
        env=settings.APP_ENV,
        version=settings.API_VERSION,
    )
    yield
    logger.info("app_shutting_down")


app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="AI-powered stock analytics, portfolio management, and trade journaling platform.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Exception Handlers ---
register_exception_handlers(app)

# --- Routers ---
from app.modules.auth.router import router as auth_router  # noqa: E402

app.include_router(auth_router, prefix=f"/api/{settings.API_VERSION}")


# --- Health & Version ---

@app.get("/health", tags=["System"])
async def health_check() -> dict:
    """Health check endpoint for load balancers and monitoring."""
    return {
        "success": True,
        "message": "OK",
        "data": {"status": "healthy"},
    }


@app.get("/version", tags=["System"])
async def version() -> dict:
    """Application version and environment info."""
    return {
        "success": True,
        "message": "Version info",
        "data": {
            "app": settings.APP_NAME,
            "version": "0.1.0",
            "api_version": settings.API_VERSION,
            "environment": settings.APP_ENV,
        },
    }
