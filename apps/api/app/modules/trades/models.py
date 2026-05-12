"""
Trade model — trade journal entries with rich tagging.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, UUIDPrimaryKeyMixin


class Trade(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "trades"

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("portfolios.id"), nullable=False, index=True
    )
    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("instruments.id"), nullable=False, index=True
    )
    trade_side: Mapped[str] = mapped_column(String(10), nullable=False)  # BUY / SELL
    quantity: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    entry_price: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    exit_price: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    stop_loss: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    target_price: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    fees: Mapped[float] = mapped_column(
        Numeric(18, 4), nullable=False, default=0, server_default=text("0")
    )
    trade_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="OPEN", server_default=text("'OPEN'")
    )
    strategy_tag: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mistake_tag: Mapped[str | None] = mapped_column(String(100), nullable=True)
    emotion_tag: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    trade_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Trade {self.trade_side} {self.instrument_id}>"
