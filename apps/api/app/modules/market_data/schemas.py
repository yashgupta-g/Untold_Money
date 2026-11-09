"""
Market data Pydantic schemas — candles and quotes.

`provider` names the broker the data came from (e.g. "fyers").
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


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
