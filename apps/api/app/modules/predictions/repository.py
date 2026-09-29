"""
Prediction repository — data access for ML predictions.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.predictions.models import Prediction


class PredictionRepository:
    """Data access for ML predictions."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_prediction(self, prediction: Prediction) -> Prediction:
        """Save a new prediction to the database."""
        self.session.add(prediction)
        await self.session.flush()
        return prediction

    async def get_latest_prediction(
        self,
        instrument_id: uuid.UUID,
        prediction_type: str,
        horizon_days: int,
        max_age_hours: int = 24,
    ) -> Optional[Prediction]:
        """
        Get the most recent prediction for an instrument.
        Returns None if the prediction is older than max_age_hours.

        This is our caching mechanism — we don't re-predict if a recent
        prediction already exists.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
        result = await self.session.execute(
            select(Prediction)
            .where(
                and_(
                    Prediction.instrument_id == instrument_id,
                    Prediction.prediction_type == prediction_type,
                    Prediction.horizon_days == horizon_days,
                    Prediction.predicted_at >= cutoff,
                )
            )
            .order_by(Prediction.predicted_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_prediction_history(
        self,
        instrument_id: uuid.UUID,
        prediction_type: str = "direction",
        limit: int = 30,
    ) -> list[Prediction]:
        """Get prediction history for accuracy tracking."""
        result = await self.session.execute(
            select(Prediction)
            .where(
                and_(
                    Prediction.instrument_id == instrument_id,
                    Prediction.prediction_type == prediction_type,
                )
            )
            .order_by(Prediction.predicted_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_accuracy_stats(
        self,
        instrument_id: uuid.UUID,
        prediction_type: str = "direction",
    ) -> dict:
        """Calculate accuracy from resolved predictions."""
        result = await self.session.execute(
            select(Prediction)
            .where(
                and_(
                    Prediction.instrument_id == instrument_id,
                    Prediction.prediction_type == prediction_type,
                    Prediction.is_correct.isnot(None),
                )
            )
        )
        predictions = list(result.scalars().all())

        if not predictions:
            return {"total": 0, "correct": 0, "accuracy": 0.0}

        correct = sum(1 for p in predictions if p.is_correct)
        return {
            "total": len(predictions),
            "correct": correct,
            "accuracy": round(correct / len(predictions), 4),
        }
