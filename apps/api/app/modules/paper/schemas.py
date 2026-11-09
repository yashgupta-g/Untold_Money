"""
Paper trading schemas.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class PaperAccountCreate(BaseModel):
    name: str = Field("Practice account", min_length=1, max_length=100)
    # ₹10,00,000 by default; between ₹10,000 and ₹100 crore.
    starting_cash: float = Field(1_000_000, ge=10_000, le=1_000_000_000)


class PaperOrderCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=50)
    side: Literal["BUY", "SELL"]
    order_type: Literal["MARKET", "LIMIT"] = "MARKET"
    quantity: int = Field(..., ge=1, le=1_000_000)
    limit_price: Optional[float] = Field(None, gt=0)
    strategy_tag: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="after")
    def _limit_needs_price(self) -> "PaperOrderCreate":
        if self.order_type == "LIMIT" and self.limit_price is None:
            raise ValueError("A limit order needs a limit price")
        if self.order_type == "MARKET":
            self.limit_price = None
        return self


class PaperOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    symbol: str
    side: str
    order_type: str
    quantity: float
    limit_price: Optional[float]
    status: str
    fill_price: Optional[float]
    fees: float
    filled_at: Optional[datetime]
    reject_reason: Optional[str]
    strategy_tag: Optional[str]
    notes: Optional[str]
    created_at: datetime


class PaperPosition(BaseModel):
    symbol: str
    name: Optional[str]
    quantity: float
    average_price: float
    last_price: Optional[float]
    market_value: Optional[float]
    unrealized_pnl: Optional[float]
    unrealized_pnl_percent: Optional[float]


class PaperAccountResponse(BaseModel):
    id: uuid.UUID
    name: str
    portfolio_id: uuid.UUID
    starting_cash: float
    cash: float
    holdings_value: float
    equity: float
    total_pnl: float
    total_pnl_percent: float
    open_orders: int
    positions: list[PaperPosition]
    created_at: datetime
    reset_at: Optional[datetime]
