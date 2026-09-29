"""
Prediction router — ML prediction API endpoints.

Endpoints:
  GET  /predictions/{symbol}           — Full prediction (Phase 1 + 2)
  GET  /predictions/{symbol}/direction — Direction only (Phase 1)
  GET  /predictions/{symbol}/target    — Price target only (Phase 2)
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.core.dependencies import AsyncSessionDep, OptionalUserIdDep
from app.modules.predictions.service import PredictionService

router = APIRouter(prefix="/predictions", tags=["ML Predictions"])


@router.get(
    "/{symbol}",
    summary="Get full ML prediction for a symbol (direction + price target)",
)
async def get_prediction(
    symbol: str,
    session: AsyncSessionDep,
    user_id: OptionalUserIdDep,
) -> dict:
    """
    Returns all available ML predictions:
    - Phase 1: Direction (UP/DOWN) with confidence
    - Phase 2: Price target range with confidence interval

    Predictions are cached for 12 hours. First request takes ~2-3 seconds
    (model training), subsequent requests are instant.
    """
    service = PredictionService(session)
    result = await service.get_full_prediction(symbol)
    return {
        "success": True,
        "message": result.message,
        "data": result.model_dump(mode="json"),
    }


@router.get(
    "/{symbol}/direction",
    summary="Get direction prediction only (Phase 1)",
)
async def get_direction_prediction(
    symbol: str,
    session: AsyncSessionDep,
    user_id: OptionalUserIdDep,
    horizon: int = Query(default=3, ge=1, le=10, description="Prediction horizon in days"),
) -> dict:
    """
    Predicts whether the stock will go UP or DOWN in the next `horizon` days.

    Uses XGBoost classifier trained on the stock's own historical patterns.
    Returns prediction direction, confidence %, top signals, and explanation.
    """
    service = PredictionService(session)
    result = await service.predict_direction(symbol, horizon=horizon)

    if result is None:
        return {
            "success": False,
            "message": f"Not enough data to predict direction for {symbol.upper()}. Need at least 80 daily candles.",
            "data": None,
        }

    return {
        "success": True,
        "message": f"Direction prediction for {symbol.upper()}",
        "data": result.model_dump(mode="json"),
    }


@router.get(
    "/{symbol}/target",
    summary="Get price target prediction (Phase 2)",
)
async def get_price_target(
    symbol: str,
    session: AsyncSessionDep,
    user_id: OptionalUserIdDep,
    horizon: int = Query(default=5, ge=1, le=10, description="Prediction horizon in days"),
) -> dict:
    """
    Predicts expected price range for the next `horizon` days.

    Uses GradientBoostingRegressor trained on historical % changes.
    Returns expected price high/low bounds with confidence interval.
    """
    service = PredictionService(session)
    result = await service.predict_price_target(symbol, horizon=horizon)

    if result is None:
        return {
            "success": False,
            "message": f"Not enough data for price target prediction on {symbol.upper()}.",
            "data": None,
        }

    return {
        "success": True,
        "message": f"Price target prediction for {symbol.upper()}",
        "data": result.model_dump(mode="json"),
    }
