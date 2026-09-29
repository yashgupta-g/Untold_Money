"""
Prediction service — orchestrates ML predictions.

Flow for each prediction request:
  1. Check cache (DB) — return if fresh prediction exists (<24h old)
  2. Fetch candle data from market_candles table
  3. Run feature engineering (FeatureEngine)
  4. Train model + predict (MLEngine)
  5. Store prediction in DB
  6. Return response

The service handles all 3 phases and gracefully returns partial results
if some phases fail (e.g., not enough data for price target but enough for direction).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.modules.instruments.repository import InstrumentRepository
from app.modules.market_data.repository import MarketDataRepository
from app.modules.predictions.ml_engine import MLEngine
from app.modules.predictions.models import Prediction
from app.modules.predictions.repository import PredictionRepository
from app.modules.predictions.schemas import (
    DirectionPrediction,
    PredictionResponse,
    PriceTargetPrediction,
    TopSignal,
)

logger = get_logger(__name__)


class PredictionService:
    """Orchestrates ML predictions for stocks."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = PredictionRepository(session)
        self.instrument_repo = InstrumentRepository(session)
        self.market_repo = MarketDataRepository(session)

    async def _resolve_instrument(self, symbol: str):
        """Look up instrument by symbol, raise 404 if not found."""
        instrument = await self.instrument_repo.get_instrument_by_symbol(symbol)
        if not instrument:
            raise NotFoundException(f"Instrument '{symbol}' not found")
        return instrument

    async def _fetch_candle_data(self, instrument_id: uuid.UUID) -> tuple:
        """Fetch and extract OHLCV arrays from candle data."""
        candles = await self.market_repo.get_candles(
            instrument_id=instrument_id, interval="1d", limit=200
        )
        if len(candles) < 80:
            return [], [], [], [], len(candles)

        closes = [float(c.close) for c in candles]
        highs = [float(c.high) for c in candles]
        lows = [float(c.low) for c in candles]
        volumes = [float(c.volume) for c in candles]
        return closes, highs, lows, volumes, len(candles)

    # ================================================================
    # PHASE 1: Direction Prediction
    # ================================================================

    async def predict_direction(
        self, symbol: str, horizon: int = 3
    ) -> Optional[DirectionPrediction]:
        """
        Get or compute direction prediction for a stock.

        Steps:
          1. Check if a fresh prediction (<24h) exists in DB → return it
          2. If not, fetch candles, run ML engine, store result
        """
        instrument = await self._resolve_instrument(symbol)

        # Check cache
        cached = await self.repo.get_latest_prediction(
            instrument_id=instrument.id,
            prediction_type="direction",
            horizon_days=horizon,
            max_age_hours=12,  # Cache for 12 hours
        )
        if cached:
            logger.info("prediction_cache_hit", symbol=symbol, type="direction")
            return DirectionPrediction(
                symbol=symbol.upper(),
                instrument_id=instrument.id,
                direction=cached.predicted_direction or "UNKNOWN",
                confidence=float(cached.confidence),
                model_accuracy=0.0,
                horizon_days=cached.horizon_days,
                explanation=cached.explanation or "",
                model_version=cached.model_version,
                predicted_at=cached.predicted_at,
                top_signals=[],
            )

        # Compute fresh prediction
        closes, highs, lows, volumes, count = await self._fetch_candle_data(instrument.id)
        if not closes:
            return None

        result = MLEngine.predict_direction(closes, highs, lows, volumes, horizon=horizon)
        if not result:
            return None

        now = datetime.now(timezone.utc)

        # Store in DB
        prediction = Prediction(
            instrument_id=instrument.id,
            prediction_type="direction",
            horizon_days=horizon,
            model_version=result["model_version"],
            predicted_direction=result["direction"],
            confidence=result["confidence"],
            current_price=closes[-1],
            features_snapshot=result.get("features"),
            explanation=result["explanation"],
            predicted_at=now,
        )
        await self.repo.save_prediction(prediction)

        logger.info(
            "prediction_computed",
            symbol=symbol,
            type="direction",
            direction=result["direction"],
            confidence=result["confidence"],
        )

        return DirectionPrediction(
            symbol=symbol.upper(),
            instrument_id=instrument.id,
            direction=result["direction"],
            confidence=result["confidence"],
            model_accuracy=result["model_accuracy"],
            horizon_days=horizon,
            top_signals=[TopSignal(**s) for s in result.get("top_signals", [])],
            explanation=result["explanation"],
            model_version=result["model_version"],
            predicted_at=now,
        )

    # ================================================================
    # PHASE 2: Price Target Prediction
    # ================================================================

    async def predict_price_target(
        self, symbol: str, horizon: int = 5
    ) -> Optional[PriceTargetPrediction]:
        """Get or compute price target prediction."""
        instrument = await self._resolve_instrument(symbol)

        # Check cache
        cached = await self.repo.get_latest_prediction(
            instrument_id=instrument.id,
            prediction_type="price_target",
            horizon_days=horizon,
            max_age_hours=12,
        )
        if cached:
            return PriceTargetPrediction(
                symbol=symbol.upper(),
                instrument_id=instrument.id,
                current_price=float(cached.current_price or 0),
                predicted_change_pct=float(cached.predicted_change_pct or 0),
                predicted_high=float(cached.predicted_high or 0),
                predicted_low=float(cached.predicted_low or 0),
                confidence_interval=0.0,
                horizon_days=cached.horizon_days,
                explanation=cached.explanation or "",
                model_version=cached.model_version,
                predicted_at=cached.predicted_at,
            )

        closes, highs, lows, volumes, count = await self._fetch_candle_data(instrument.id)
        if not closes:
            return None

        result = MLEngine.predict_price_target(closes, highs, lows, volumes, horizon=horizon)
        if not result:
            return None

        now = datetime.now(timezone.utc)

        prediction = Prediction(
            instrument_id=instrument.id,
            prediction_type="price_target",
            horizon_days=horizon,
            model_version=result["model_version"],
            predicted_change_pct=result["predicted_change_pct"],
            predicted_high=result["predicted_high"],
            predicted_low=result["predicted_low"],
            current_price=result["current_price"],
            confidence=1.0 - min(result["confidence_interval"] / 10, 1.0),
            explanation=result["explanation"],
            predicted_at=now,
        )
        await self.repo.save_prediction(prediction)

        return PriceTargetPrediction(
            symbol=symbol.upper(),
            instrument_id=instrument.id,
            current_price=result["current_price"],
            predicted_change_pct=result["predicted_change_pct"],
            predicted_high=result["predicted_high"],
            predicted_low=result["predicted_low"],
            confidence_interval=result["confidence_interval"],
            horizon_days=horizon,
            explanation=result["explanation"],
            model_version=result["model_version"],
            predicted_at=now,
        )

    # ================================================================
    # COMBINED: Full Prediction
    # ================================================================

    async def get_full_prediction(
        self, symbol: str
    ) -> PredictionResponse:
        """
        Get all available predictions for a symbol.
        Runs Phase 1 + Phase 2 in sequence. Phase 3 requires trade data
        and is called separately.
        """
        instrument = await self._resolve_instrument(symbol)
        closes, highs, lows, volumes, count = await self._fetch_candle_data(instrument.id)

        response = PredictionResponse(
            symbol=symbol.upper(),
            instrument_id=instrument.id,
            candle_count=count,
        )

        if count < 80:
            response.message = (
                f"Need at least 80 daily candles for predictions, have {count}. "
                f"The model needs sufficient historical data to learn patterns."
            )
            return response

        # Phase 1 — Direction (3-day horizon)
        try:
            direction = await self.predict_direction(symbol, horizon=3)
            response.direction = direction
        except Exception as e:
            logger.warning("direction_prediction_failed", symbol=symbol, error=str(e))

        # Phase 2 — Price Target (5-day horizon)
        try:
            price_target = await self.predict_price_target(symbol, horizon=5)
            response.price_target = price_target
        except Exception as e:
            logger.warning("price_target_prediction_failed", symbol=symbol, error=str(e))

        response.message = "Predictions generated successfully"
        return response
