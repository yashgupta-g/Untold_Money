"""
Paper trading models — a practice account with virtual cash.

Positions live in the account's own portfolio (`kind="paper"`) as ordinary
holdings, so the existing portfolio and allocation views work on them, and
every fill is written to the trade journal.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PaperAccount(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "paper_accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    starting_cash: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    cash: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    reset_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class PaperOrder(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "paper_orders"

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("paper_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("instruments.id"), nullable=False
    )
    symbol: Mapped[str] = mapped_column(String(50), nullable=False)
    side: Mapped[str] = mapped_column(String(10), nullable=False)  # BUY | SELL
    order_type: Mapped[str] = mapped_column(String(10), nullable=False)  # MARKET | LIMIT
    quantity: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    limit_price: Mapped[Optional[float]] = mapped_column(Numeric(18, 4), nullable=True)
    # OPEN (resting limit) | FILLED | CANCELLED | REJECTED
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'OPEN'"))
    fill_price: Mapped[Optional[float]] = mapped_column(Numeric(18, 4), nullable=True)
    fees: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0, server_default=text("0"))
    filled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reject_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    strategy_tag: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
