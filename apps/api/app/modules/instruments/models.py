"""
Instrument and exchange models — stock/security entities and their exchanges.

Instruments store both basic info (symbol, name, exchange) and rich company
data (market_cap, PE ratio, description, etc.) fetched from Yahoo Finance
during data ingestion.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UUIDPrimaryKeyMixin


class Exchange(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "exchanges"

    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(50), nullable=False, default="IN")

    instruments: Mapped[list["Instrument"]] = relationship(back_populates="exchange", lazy="select")

    def __repr__(self) -> str:
        return f"<Exchange {self.code}>"


class Instrument(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "instruments"
    __table_args__ = (
        UniqueConstraint("exchange_id", "symbol", name="uq_instruments_exchange_symbol"),
    )

    exchange_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exchanges.id"), nullable=False, index=True
    )
    symbol: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    instrument_type: Mapped[str] = mapped_column(String(20), nullable=False, default="EQUITY")
    isin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sector: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    currency: Mapped[str] = mapped_column(
        String(10), nullable=False, default="INR", server_default=text("'INR'")
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Company info (populated from Yahoo Finance during ingestion) ---
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    market_cap: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    pe_ratio: Mapped[Optional[float]] = mapped_column(Numeric(12, 4), nullable=True)
    eps: Mapped[Optional[float]] = mapped_column(Numeric(12, 4), nullable=True)
    dividend_yield: Mapped[Optional[float]] = mapped_column(Numeric(8, 6), nullable=True)
    fifty_two_week_high: Mapped[Optional[float]] = mapped_column(Numeric(18, 4), nullable=True)
    fifty_two_week_low: Mapped[Optional[float]] = mapped_column(Numeric(18, 4), nullable=True)
    avg_volume: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    info_updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    exchange: Mapped["Exchange"] = relationship(back_populates="instruments")

    def __repr__(self) -> str:
        return f"<Instrument {self.symbol}>"
