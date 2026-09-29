"""
Trade router — authenticated endpoints for trade journaling.
All endpoints require a valid JWT token.
Includes expanded filtering (symbol, date range) and comprehensive analytics.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query

from app.core.dependencies import AsyncSessionDep, CurrentUserIdDep
from app.modules.trades.schemas import TradeCreateRequest, TradeUpdateRequest
from app.modules.trades.service import TradeService

router = APIRouter(prefix="/trades", tags=["Trades"])


@router.get("", summary="List user's trades with filters")
async def list_trades(
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
    portfolio_id: Optional[uuid.UUID] = Query(default=None),
    trade_side: Optional[str] = Query(default=None, pattern=r"^(BUY|SELL)$"),
    trade_status: Optional[str] = Query(default=None, pattern=r"^(OPEN|CLOSED)$"),
    strategy_tag: Optional[str] = Query(default=None),
    symbol: Optional[str] = Query(default=None, description="Filter by symbol (partial match)"),
    date_from: Optional[datetime] = Query(default=None, description="Start date (ISO 8601)"),
    date_to: Optional[datetime] = Query(default=None, description="End date (ISO 8601)"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict:
    service = TradeService(session)
    trades = await service.list_trades(
        user_id=user_id,
        portfolio_id=portfolio_id,
        trade_side=trade_side,
        trade_status=trade_status,
        strategy_tag=strategy_tag,
        symbol=symbol,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return {
        "success": True,
        "message": "Trades retrieved",
        "data": [t.model_dump(mode="json") for t in trades],
    }


@router.get("/analytics/summary", summary="Comprehensive trade analytics")
async def get_analytics_summary(
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = TradeService(session)
    analytics = await service.get_analytics_summary(user_id)
    return {
        "success": True,
        "message": "Trade analytics retrieved",
        "data": analytics.model_dump(mode="json"),
    }


# Keep backward-compat stats endpoint
@router.get("/stats", summary="Get trade journal stats (legacy)")
async def get_trade_stats(
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = TradeService(session)
    analytics = await service.get_analytics_summary(user_id)
    # Return the subset for backward compat
    return {
        "success": True,
        "message": "Trade stats retrieved",
        "data": {
            "total_trades": analytics.total_trades,
            "open_trades": analytics.open_trades,
            "closed_trades": analytics.closed_trades,
            "total_pnl": analytics.total_pnl,
            "win_count": analytics.win_count,
            "loss_count": analytics.loss_count,
            "win_rate": analytics.win_rate,
            "avg_pnl": round(analytics.total_pnl / analytics.closed_trades, 2) if analytics.closed_trades > 0 else 0.0,
        },
    }


@router.post("", summary="Log a new trade")
async def create_trade(
    data: TradeCreateRequest,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = TradeService(session)
    trade = await service.create_trade(user_id, data)
    return {
        "success": True,
        "message": "Trade logged",
        "data": trade.model_dump(mode="json"),
    }


@router.get("/{trade_id}", summary="Get a specific trade")
async def get_trade(
    trade_id: uuid.UUID,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = TradeService(session)
    trade = await service.get_trade(trade_id, user_id)
    return {
        "success": True,
        "message": "Trade retrieved",
        "data": trade.model_dump(mode="json"),
    }


@router.put("/{trade_id}", summary="Update a trade")
async def update_trade(
    trade_id: uuid.UUID,
    data: TradeUpdateRequest,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = TradeService(session)
    trade = await service.update_trade(trade_id, user_id, data)
    return {
        "success": True,
        "message": "Trade updated",
        "data": trade.model_dump(mode="json"),
    }


@router.delete("/{trade_id}", summary="Delete a trade")
async def delete_trade(
    trade_id: uuid.UUID,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = TradeService(session)
    await service.delete_trade(trade_id, user_id)
    return {
        "success": True,
        "message": "Trade deleted",
        "data": None,
    }
