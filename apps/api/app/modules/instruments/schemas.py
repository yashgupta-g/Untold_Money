"""
Instrument & Exchange Pydantic schemas for request/response serialization.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------- Exchange ----------

class ExchangeResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    country: str

    model_config = {"from_attributes": True}


class ExchangeCreateRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    country: str = Field(default="IN", max_length=50)


# ---------- Instrument ----------

class InstrumentResponse(BaseModel):
    id: uuid.UUID
    exchange_id: uuid.UUID
    symbol: str
    name: str
    instrument_type: str
    isin: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    currency: str
    is_active: bool
    created_at: datetime
    exchange: Optional[ExchangeResponse] = None

    model_config = {"from_attributes": True}


class InstrumentCreateRequest(BaseModel):
    exchange_id: uuid.UUID
    symbol: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    instrument_type: str = Field(default="EQUITY", max_length=20)
    isin: Optional[str] = Field(default=None, max_length=20)
    sector: Optional[str] = Field(default=None, max_length=100)
    industry: Optional[str] = Field(default=None, max_length=100)
    currency: str = Field(default="INR", max_length=10)
    is_active: bool = True


class InstrumentUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    instrument_type: Optional[str] = Field(default=None, max_length=20)
    isin: Optional[str] = Field(default=None, max_length=20)
    sector: Optional[str] = Field(default=None, max_length=100)
    industry: Optional[str] = Field(default=None, max_length=100)
    currency: Optional[str] = Field(default=None, max_length=10)
    is_active: Optional[bool] = None


class InstrumentSearchParams(BaseModel):
    q: str = Field(default="", max_length=100)
    exchange_code: Optional[str] = None
    instrument_type: Optional[str] = None
    is_active: bool = True
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
