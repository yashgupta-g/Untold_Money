"""
Trade Pydantic schemas for request/response serialization.
Includes expanded analytics response with profit factor, expectancy,
and tag-level breakdowns.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TradeResponse(BaseModel):
    id: uuid.UUID
    portfolio_id: uuid.UUID
    instrument_id: uuid.UUID
    trade_side: str
    quantity: float
    entry_price: float
    exit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    target_price: Optional[float] = None
    fees: float
    trade_status: str
    strategy_tag: Optional[str] = None
    mistake_tag: Optional[str] = None
    emotion_tag: Optional[str] = None
    notes: Optional[str] = None
    trade_time: datetime
    created_at: datetime
    # Enriched
    symbol: Optional[str] = None
    name: Optional[str] = None
    pnl: Optional[float] = None
    pnl_percent: Optional[float] = None

    model_config = {"from_attributes": True}


class TradeCreateRequest(BaseModel):
    portfolio_id: uuid.UUID
    instrument_id: uuid.UUID
    trade_side: str = Field(..., pattern=r"^(BUY|SELL)$")
    quantity: float = Field(..., gt=0)
    entry_price: float = Field(..., gt=0)
    exit_price: Optional[float] = Field(default=None, gt=0)
    stop_loss: Optional[float] = Field(default=None, gt=0)
    target_price: Optional[float] = Field(default=None, gt=0)
    fees: float = Field(default=0.0, ge=0)
    trade_status: str = Field(default="OPEN", pattern=r"^(OPEN|CLOSED)$")
    strategy_tag: Optional[str] = Field(default=None, max_length=100)
    mistake_tag: Optional[str] = Field(default=None, max_length=100)
    emotion_tag: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None
    trade_time: datetime


class TradeUpdateRequest(BaseModel):
    exit_price: Optional[float] = Field(default=None, gt=0)
    stop_loss: Optional[float] = Field(default=None, gt=0)
    target_price: Optional[float] = Field(default=None, gt=0)
    fees: Optional[float] = Field(default=None, ge=0)
    trade_status: Optional[str] = Field(default=None, pattern=r"^(OPEN|CLOSED)$")
    strategy_tag: Optional[str] = Field(default=None, max_length=100)
    mistake_tag: Optional[str] = Field(default=None, max_length=100)
    emotion_tag: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None


class TradeFilterParams(BaseModel):
    portfolio_id: Optional[uuid.UUID] = None
    trade_side: Optional[str] = None
    trade_status: Optional[str] = None
    strategy_tag: Optional[str] = None
    symbol: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


# ---------- Analytics ----------

class TagPerformance(BaseModel):
    """Performance breakdown for a strategy/mistake/emotion tag."""
    tag: str
    trade_count: int
    total_pnl: float
    win_rate: float


class TradeAnalyticsSummary(BaseModel):
    """Comprehensive trade analytics — the core analytics endpoint."""
    total_trades: int
    open_trades: int
    closed_trades: int
    total_pnl: float
    win_count: int
    loss_count: int
    win_rate: float
    avg_win: float
    avg_loss: float
    profit_factor: float       # gross_wins / abs(gross_losses)
    expectancy: float           # (win_rate * avg_win) - (loss_rate * avg_loss)
    best_trade_pnl: float
    worst_trade_pnl: float
    best_strategy: Optional[TagPerformance] = None
    worst_strategy: Optional[TagPerformance] = None
    most_common_mistake: Optional[str] = None
    most_common_mistake_count: int = 0


# Keep backward compat alias
class TradeStatsResponse(BaseModel):
    total_trades: int
    open_trades: int
    closed_trades: int
    total_pnl: float
    win_count: int
    loss_count: int
    win_rate: float
    avg_pnl: float
