"""
Analytics repository — data access for technical indicators and stock scores.
"""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.analytics.models import StockScore, TechnicalIndicator


class AnalyticsRepository:
    """Data access for analytics models."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ---------- Technical Indicators ----------

    async def get_indicators(
        self, instrument_id: uuid.UUID
    ) -> list[TechnicalIndicator]:
        result = await self.session.execute(
            select(TechnicalIndicator)
            .where(TechnicalIndicator.instrument_id == instrument_id)
            .order_by(TechnicalIndicator.indicator_name)
        )
        return list(result.scalars().all())

    async def upsert_indicators(
        self, instrument_id: uuid.UUID, indicators: list[TechnicalIndicator]
    ) -> int:
        """Delete old indicators and insert fresh ones."""
        await self.session.execute(
            delete(TechnicalIndicator).where(
                TechnicalIndicator.instrument_id == instrument_id
            )
        )
        self.session.add_all(indicators)
        await self.session.flush()
        return len(indicators)

    # ---------- Stock Score ----------

    async def get_score(
        self, instrument_id: uuid.UUID
    ) -> Optional[StockScore]:
        result = await self.session.execute(
            select(StockScore).where(StockScore.instrument_id == instrument_id)
        )
        return result.scalar_one_or_none()

    async def upsert_score(self, score: StockScore) -> StockScore:
        """Insert or update (merge) a stock score."""
        existing = await self.get_score(score.instrument_id)
        if existing:
            existing.trend_score = score.trend_score
            existing.momentum_score = score.momentum_score
            existing.volatility_score = score.volatility_score
            existing.volume_score = score.volume_score
            existing.final_score = score.final_score
            existing.signal = score.signal
            existing.computed_at = score.computed_at
            await self.session.flush()
            return existing
        self.session.add(score)
        await self.session.flush()
        return score
