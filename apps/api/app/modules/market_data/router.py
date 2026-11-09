"""
Market data router — quotes and candles from the signed-in user's broker.

Answers 428 BROKER_REQUIRED when the user has no live broker connection.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query

from app.core.dependencies import AsyncSessionDep, OptionalUserIdDep
from app.modules.market_data.service import MarketDataService

router = APIRouter(prefix="/market-data", tags=["Market Data"])


@router.get("/quotes", summary="Live quotes for up to 50 symbols, in one broker call")
async def get_quotes(
    session: AsyncSessionDep,
    user_id: OptionalUserIdDep,
    symbols: str = Query(..., min_length=1, max_length=1000, description="Comma-separated symbols"),
) -> dict:
    quotes = await MarketDataService(session).get_quotes(symbols.split(","), user_id)
    return {
        "success": True,
        "message": f"{len(quotes)} quotes",
        "data": {symbol: q.model_dump(mode="json") for symbol, q in quotes.items()},
    }


@router.get("/{symbol}/candles", summary="OHLCV candles from your broker")
async def get_candles(
    symbol: str,
    session: AsyncSessionDep,
    user_id: OptionalUserIdDep,
    interval: str = Query(default="1d", pattern=r"^(1m|5m|15m|1h|4h|1d|1w)$"),
    start: Optional[datetime] = Query(default=None, description="Start datetime (ISO 8601)"),
    end: Optional[datetime] = Query(default=None, description="End datetime (ISO 8601)"),
    limit: int = Query(default=200, ge=1, le=5000),
) -> dict:
    candles = await MarketDataService(session).get_candles(
        symbol, user_id, interval=interval, start=start, end=end, limit=limit
    )
    return {
        "success": True,
        "message": f"Candles for {symbol.upper()}",
        "data": [c.model_dump(mode="json") for c in candles],
    }


@router.get("/{symbol}/quote", summary="Live quote from your broker")
async def get_quote(symbol: str, session: AsyncSessionDep, user_id: OptionalUserIdDep) -> dict:
    quote = await MarketDataService(session).get_quote(symbol, user_id)
    return {
        "success": True,
        "message": f"Quote for {symbol.upper()}",
        "data": quote.model_dump(mode="json"),
    }
