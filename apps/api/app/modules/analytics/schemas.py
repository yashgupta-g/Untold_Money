"""
Analytics Pydantic schemas for request/response serialization.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ---------- Indicator ----------

class IndicatorValue(BaseModel):
    """A single technical indicator with signal and explanation."""
    name: str                           # SMA_20, RSI_14, MACD, etc.
    value: float
    signal: Optional[str] = None        # BULLISH / BEARISH / NEUTRAL
    description: str = ""               # Human-readable explanation

    model_config = {"from_attributes": True}


class IndicatorsResponse(BaseModel):
    """All computed technical indicators for a symbol."""
    symbol: str
    instrument_id: uuid.UUID
    computed_at: Optional[datetime] = None
    candle_count: int = 0               # How many candles were used
    indicators: list[IndicatorValue] = []


# ---------- Stock Score ----------

class StockScoreResponse(BaseModel):
    """Composite stock score with sub-scores."""
    symbol: str
    instrument_id: uuid.UUID
    trend_score: float
    momentum_score: float
    volatility_score: float
    volume_score: float
    final_score: float
    signal: Optional[str] = None        # STRONG_BUY, BUY, NEUTRAL, SELL, STRONG_SELL
    computed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------- Recalculate ----------

class RecalculateResponse(BaseModel):
    """Response from a recalculation request."""
    symbol: str
    instrument_id: uuid.UUID
    indicator_count: int
    score: Optional[StockScoreResponse] = None
    message: str = "Indicators recalculated successfully"
