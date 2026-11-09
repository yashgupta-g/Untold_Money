"""
Broker connection model — one row per user per linked broker.

Tokens are stored encrypted (see brokers/crypto.py) and never leave the API.
Indian brokers expire access tokens daily, so `status` moves to "expired"
until the user reconnects.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class BrokerConnection(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "broker_connections"
    __table_args__ = (UniqueConstraint("user_id", "broker", name="uq_broker_connections_user_broker"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    broker: Mapped[str] = mapped_column(String(20), nullable=False)  # angelone | fyers
    # pending (own API key saved, not linked yet) | active | expired (token
    # lapsed; reconnect) | error (last sync failed)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default=text("'active'")
    )
    broker_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # The user's own broker developer app (advanced "bring your own key").
    # Empty means the platform's app from settings is used.
    app_id_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    app_secret_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    access_token_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refresh_token_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feed_token_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # The user's own daily-loss alert, in rupees (alert only; no orders yet).
    daily_loss_limit: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
