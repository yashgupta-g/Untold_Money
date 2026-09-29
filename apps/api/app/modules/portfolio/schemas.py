"""
Portfolio & Holdings Pydantic schemas for request/response serialization.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------- Holding ----------

class HoldingResponse(BaseModel):
    id: uuid.UUID
    portfolio_id: uuid.UUID
    instrument_id: uuid.UUID
    quantity: float
    average_price: float
    source: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Enriched fields (filled by service layer)
    symbol: Optional[str] = None
    name: Optional[str] = None
    current_price: Optional[float] = None
    pnl: Optional[float] = None
    pnl_percent: Optional[float] = None
    market_value: Optional[float] = None

    model_config = {"from_attributes": True}


class HoldingCreateRequest(BaseModel):
    instrument_id: uuid.UUID
    quantity: float = Field(..., gt=0)
    average_price: float = Field(..., gt=0)
    source: str = Field(default="MANUAL", max_length=20)


class HoldingUpdateRequest(BaseModel):
    quantity: Optional[float] = Field(default=None, gt=0)
    average_price: Optional[float] = Field(default=None, gt=0)


# ---------- Portfolio ----------

class PortfolioResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    base_currency: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    holdings_count: Optional[int] = None
    total_invested: Optional[float] = None
    total_value: Optional[float] = None
    total_pnl: Optional[float] = None
    pnl_percent: Optional[float] = None

    model_config = {"from_attributes": True}


class PortfolioCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    base_currency: str = Field(default="INR", max_length=10)


class PortfolioUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    base_currency: Optional[str] = Field(default=None, max_length=10)


class PortfolioDetailResponse(PortfolioResponse):
    """Extended response with holdings included."""
    holdings: list[HoldingResponse] = []


# ---------- Summary ----------

class HoldingSummaryItem(BaseModel):
    """Compact holding representation for top gainer/loser display."""
    symbol: str
    name: str
    pnl: float
    pnl_percent: float


class PortfolioSummaryResponse(BaseModel):
    """Aggregated portfolio analytics."""
    portfolio_id: uuid.UUID
    name: str
    total_invested: float
    total_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    holdings_count: int
    top_gainer: Optional[HoldingSummaryItem] = None
    top_loser: Optional[HoldingSummaryItem] = None


# ---------- Allocation ----------

class AllocationItem(BaseModel):
    """Per-holding allocation breakdown."""
    instrument_id: uuid.UUID
    symbol: str
    name: str
    sector: Optional[str] = None
    market_value: float
    allocation_percent: float


class SectorAllocation(BaseModel):
    """Sector-level allocation aggregate."""
    sector: str
    total_value: float
    allocation_percent: float


class PortfolioAllocationResponse(BaseModel):
    """Full allocation breakdown including sector analysis and risk flags."""
    portfolio_id: uuid.UUID
    total_value: float
    holdings: list[AllocationItem]
    sector_breakdown: list[SectorAllocation]
    concentration_risk: bool  # True if any single holding > 30% of portfolio
