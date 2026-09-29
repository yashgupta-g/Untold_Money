"""
Analytics router — endpoints for technical indicators and stock scoring.
Includes admin recalculation endpoint.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.core.dependencies import AsyncSessionDep, CurrentUserIdDep, OptionalUserIdDep
from app.modules.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])
admin_router = APIRouter(prefix="/admin/analytics", tags=["Analytics (Admin)"])


@router.get("/{symbol}/indicators", summary="Get technical indicators for a symbol")
async def get_indicators(
    symbol: str,
    session: AsyncSessionDep,
    user_id: OptionalUserIdDep,
) -> dict:
    service = AnalyticsService(session)
    result = await service.get_indicators(symbol)
    return {
        "success": True,
        "message": "Indicators retrieved",
        "data": result.model_dump(mode="json"),
    }


@router.get("/{symbol}/score", summary="Get stock score for a symbol")
async def get_score(
    symbol: str,
    session: AsyncSessionDep,
    user_id: OptionalUserIdDep,
) -> dict:
    service = AnalyticsService(session)
    result = await service.get_score(symbol)
    return {
        "success": True,
        "message": "Score retrieved",
        "data": result.model_dump(mode="json"),
    }


@admin_router.post("/recalculate/{symbol}", summary="Force recalculate indicators for a symbol")
async def recalculate(
    symbol: str,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = AnalyticsService(session)
    result = await service.recalculate(symbol)
    return {
        "success": True,
        "message": f"Recalculated indicators for {symbol.upper()}",
        "data": result.model_dump(mode="json"),
    }
