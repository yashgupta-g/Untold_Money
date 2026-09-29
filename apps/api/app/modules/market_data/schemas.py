"""
Market data Pydantic schemas — candles, quotes, and ingestion.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class CandleResponse(BaseModel):
    instrument_id: uuid.UUID
    symbol: Optional[str] = None
    candle_time: datetime
    interval: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    provider: str

    model_config = {"from_attributes": True}


class CandleQueryParams(BaseModel):
    interval: str = Field(default="1d", pattern=r"^(1m|5m|15m|1h|4h|1d|1w)$")
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    limit: int = Field(default=200, ge=1, le=1000)


class QuoteResponse(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    high: float
    low: float
    open: float
    previous_close: float
    volume: int
    timestamp: datetime
    provider: str


class CandleData(BaseModel):
    """Raw candle data from a provider before DB insertion."""
    candle_time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int = 0

    @model_validator(mode="after")
    def validate_ohlc(self) -> "CandleData":
        if self.high < self.low:
            raise ValueError("high must be >= low")
        if self.open < self.low or self.open > self.high:
            raise ValueError("open must be between low and high")
        if self.close < self.low or self.close > self.high:
            raise ValueError("close must be between low and high")
        if self.volume < 0:
            raise ValueError("volume must be >= 0")
        return self


class IngestionRunResponse(BaseModel):
    id: uuid.UUID
    provider: str
    symbol_count: int
    candle_count: int
    status: str
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class IngestRequest(BaseModel):
    """Request to trigger real market data ingestion from Yahoo Finance."""
    symbols: Optional[list[str]] = Field(
        default=None,
        description="Specific symbols to ingest. If empty, ingest all active NSE instruments.",
    )
    interval: str = Field(default="1d", pattern=r"^(1m|5m|15m|1h|4h|1d|1w)$")
    days: int = Field(default=365, ge=1, le=730, description="Number of days of history to fetch")
