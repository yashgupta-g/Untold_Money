"""
Prediction models — stores ML predictions for instruments.

Each prediction record captures:
  - What was predicted (direction, price target, trade outcome)
  - The model version that made it
  - Confidence level
  - The actual outcome (filled in later to track accuracy)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Prediction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    A single ML prediction for an instrument.

    prediction_type:
      - 'direction'     → Phase 1: UP/DOWN classification
      - 'price_target'  → Phase 2: expected price range
      - 'trade_outcome' → Phase 3: win/loss probability for user trades

    horizon_days:
      How many days into the future is this prediction for (1, 3, 5).

    predicted_direction:
      'UP' or 'DOWN' (Phase 1)

    confidence:
      0.0 to 1.0 — how confident the model is in this prediction.

    predicted_change_pct:
      Expected % change in price (Phase 2).

    predicted_high / predicted_low:
      Expected price range bounds (Phase 2).

    features_snapshot:
      JSON snapshot of the features used to make this prediction.
      Stored for explainability and debugging.

    actual_direction / actual_change_pct:
      Filled in after the horizon period to track model accuracy.
    """
    __tablename__ = "predictions"

    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("instruments.id"), nullable=False, index=True
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )

    # What kind of prediction
    prediction_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # 'direction', 'price_target', 'trade_outcome'
    horizon_days: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1")

    # Phase 1 — Direction
    predicted_direction: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    confidence: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False, default=0.5)

    # Phase 2 — Price Target
    predicted_change_pct: Mapped[Optional[float]] = mapped_column(Numeric(10, 4), nullable=True)
    predicted_high: Mapped[Optional[float]] = mapped_column(Numeric(14, 4), nullable=True)
    predicted_low: Mapped[Optional[float]] = mapped_column(Numeric(14, 4), nullable=True)
    current_price: Mapped[Optional[float]] = mapped_column(Numeric(14, 4), nullable=True)

    # Phase 3 — Trade outcome
    predicted_win_probability: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)

    # Feature snapshot for explainability
    features_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Actual outcome (filled in later for accuracy tracking)
    actual_direction: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    actual_change_pct: Mapped[Optional[float]] = mapped_column(Numeric(10, 4), nullable=True)
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Timestamps
    predicted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Prediction {self.prediction_type} {self.predicted_direction} conf={self.confidence}>"
