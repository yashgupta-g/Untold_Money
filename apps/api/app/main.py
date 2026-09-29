"""
UntoldMoney API — FastAPI application entry point.
"""

from fastapi import FastAPI
from contextlib import asynccontextmanager

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import get_logger, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    setup_logging()
    settings = get_settings()
    logger = get_logger(__name__)
    logger.info(
        "app_starting",
        app_name=settings.APP_NAME,
        env=settings.APP_ENV,
        version=settings.API_VERSION,
    )
    yield
    logger.info("app_shutting_down")


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI app."""
    settings = get_settings()

    application = FastAPI(
        title=f"{settings.APP_NAME} API",
        description="AI-powered stock analytics, portfolio management, and trade journaling platform.",
        version="0.1.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    # --- Middleware ---
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
    )

    # --- Exception Handlers ---
    register_exception_handlers(application)

    # --- Routers ---
    from app.modules.auth.router import router as auth_router  # noqa: E402
    from app.modules.instruments.router import (  # noqa: E402
        router as instruments_router,
        admin_router as instruments_admin_router,
    )
    from app.modules.market_data.router import (  # noqa: E402
        router as market_data_router,
        admin_router as market_data_admin_router,
    )
    from app.modules.portfolio.router import router as portfolio_router  # noqa: E402
    from app.modules.trades.router import router as trades_router  # noqa: E402
    from app.modules.analytics.router import (  # noqa: E402
        router as analytics_router,
        admin_router as analytics_admin_router,
    )
    from app.modules.predictions.router import router as predictions_router  # noqa: E402

    api_prefix = f"/api/{settings.API_VERSION}"
    application.include_router(auth_router, prefix=api_prefix)
    application.include_router(instruments_router, prefix=api_prefix)
    application.include_router(instruments_admin_router, prefix=api_prefix)
    application.include_router(market_data_router, prefix=api_prefix)
    application.include_router(market_data_admin_router, prefix=api_prefix)
    application.include_router(portfolio_router, prefix=api_prefix)
    application.include_router(trades_router, prefix=api_prefix)
    application.include_router(analytics_router, prefix=api_prefix)
    application.include_router(analytics_admin_router, prefix=api_prefix)
    application.include_router(predictions_router, prefix=api_prefix)

    # --- MCP Server (AI Agent Tools) ---
    from app.mcp.server import mcp as mcp_server
    application.mount("/mcp", mcp_server.sse_app())

    # --- Health & Version ---

    @application.get("/health", tags=["System"])
    async def health_check() -> dict:
        """Health check endpoint for load balancers and monitoring."""
        return {
            "success": True,
            "message": "OK",
            "data": {"status": "healthy"},
        }

    @application.get("/version", tags=["System"])
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

    return application


app = create_app()
