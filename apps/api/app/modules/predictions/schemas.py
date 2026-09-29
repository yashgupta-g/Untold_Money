"""
Prediction schemas — API request/response models.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ---------- Feature Signal ----------

class TopSignal(BaseModel):
    """A feature that significantly influenced the prediction."""
    feature: str
    importance: float
    value: float


# ---------- Phase 1: Direction Prediction ----------

class DirectionPrediction(BaseModel):
    """ML direction prediction for a stock."""
    symbol: str
    instrument_id: uuid.UUID
    direction: str                       # UP or DOWN
    confidence: float                    # 0.0 to 1.0
    model_accuracy: float                # accuracy on validation set
    horizon_days: int = 3
    top_signals: list[TopSignal] = []
    explanation: str = ""
    model_version: str = "v1.0"
    predicted_at: Optional[datetime] = None


# ---------- Phase 2: Price Target ----------

class PriceTargetPrediction(BaseModel):
    """ML price range prediction for a stock."""
    symbol: str
    instrument_id: uuid.UUID
    current_price: float
    predicted_change_pct: float
    predicted_high: float
    predicted_low: float
    confidence_interval: float
    horizon_days: int = 5
    explanation: str = ""
    model_version: str = "v1.0"
    predicted_at: Optional[datetime] = None


# ---------- Phase 3: Trade Outcome ----------

class TradeOutcomePrediction(BaseModel):
    """ML trade win probability prediction."""
    symbol: str
    win_probability: float
    recommendation: str                  # HIGH_CONFIDENCE, MODERATE, CAUTION
    historical_trades: int
    explanation: str = ""


# ---------- Combined Response ----------

class PredictionResponse(BaseModel):
    """Full prediction response with all phases."""
    symbol: str
    instrument_id: uuid.UUID
    direction: Optional[DirectionPrediction] = None
    price_target: Optional[PriceTargetPrediction] = None
    trade_outcome: Optional[TradeOutcomePrediction] = None
    candle_count: int = 0
    message: str = ""
