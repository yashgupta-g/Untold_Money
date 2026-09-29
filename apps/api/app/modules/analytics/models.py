"""
Analytics models — technical indicators and stock scores
computed from market candle data.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, UUIDPrimaryKeyMixin


class TechnicalIndicator(UUIDPrimaryKeyMixin, Base):
    """Stores computed technical indicators for an instrument."""
    __tablename__ = "technical_indicators"

    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("instruments.id"), nullable=False, index=True
    )
    indicator_name: Mapped[str] = mapped_column(String(50), nullable=False)  # SMA_20, RSI_14, etc.
    indicator_value: Mapped[float] = mapped_column(Numeric(18, 6), nullable=False)
    signal: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # BULLISH, BEARISH, NEUTRAL
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<TechnicalIndicator {self.indicator_name}={self.indicator_value}>"


class StockScore(UUIDPrimaryKeyMixin, Base):
    """Composite stock score derived from technical indicators."""
    __tablename__ = "stock_scores"

    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("instruments.id"), nullable=False, unique=True, index=True
    )
    trend_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    momentum_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    volatility_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    volume_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    final_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    signal: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # STRONG_BUY, BUY, NEUTRAL, SELL, STRONG_SELL
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<StockScore {self.instrument_id} final={self.final_score}>"
