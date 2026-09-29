"""
Market data router — public endpoints for candles and quotes,
plus admin endpoints for real data ingestion from Yahoo Finance.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query

from app.core.dependencies import AsyncSessionDep, CurrentUserIdDep
from app.modules.market_data.schemas import IngestRequest
from app.modules.market_data.service import MarketDataService

# --- Public routes ---
router = APIRouter(prefix="/market-data", tags=["Market Data"])


@router.get("/{symbol}/candles", summary="Get OHLCV candles for a symbol")
async def get_candles(
    symbol: str,
    session: AsyncSessionDep,
    interval: str = Query(default="1d", pattern=r"^(1m|5m|15m|1h|4h|1d|1w)$"),
    start: Optional[datetime] = Query(default=None, description="Start datetime (ISO 8601)"),
    end: Optional[datetime] = Query(default=None, description="End datetime (ISO 8601)"),
    limit: int = Query(default=200, ge=1, le=1000),
) -> dict:
    service = MarketDataService(session)
    candles = await service.get_candles(
        symbol=symbol, interval=interval, start=start, end=end, limit=limit,
    )
    return {
        "success": True,
        "message": f"Candles for {symbol.upper()}",
        "data": [c.model_dump(mode="json") for c in candles],
    }


@router.get("/{symbol}/quote", summary="Get latest quote for a symbol")
async def get_quote(
    symbol: str,
    session: AsyncSessionDep,
) -> dict:
    service = MarketDataService(session)
    quote = await service.get_quote(symbol)
    return {
        "success": True,
        "message": f"Quote for {symbol.upper()}",
        "data": quote.model_dump(mode="json"),
    }


# --- Admin routes ---
admin_router = APIRouter(prefix="/admin/market-data", tags=["Admin — Market Data"])


@admin_router.post("/ingest", summary="Trigger real data ingestion from Yahoo Finance")
async def ingest_data(
    data: IngestRequest,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = MarketDataService(session)
    result = await service.ingest_data(
        symbols=data.symbols,
        interval=data.interval,
        days=data.days,
        actor_user_id=user_id,
    )
    return {
        "success": True,
        "message": "Yahoo Finance data ingestion completed",
        "data": result.model_dump(mode="json"),
    }
