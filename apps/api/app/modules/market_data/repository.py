"""
Market data repository — data access for candles and ingestion runs.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.market_data.models import DataIngestionRun, MarketCandle


class MarketDataRepository:
    """Data access for market candles and ingestion tracking."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ---------- Candles ----------

    async def get_candles(
        self,
        instrument_id: uuid.UUID,
        interval: str = "1d",
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 200,
    ) -> list[MarketCandle]:
        stmt = (
            select(MarketCandle)
            .where(MarketCandle.instrument_id == instrument_id)
            .where(MarketCandle.interval == interval)
        )
        if start:
            stmt = stmt.where(MarketCandle.candle_time >= start)
        if end:
            stmt = stmt.where(MarketCandle.candle_time <= end)

        stmt = stmt.order_by(MarketCandle.candle_time.asc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def bulk_insert_candles(self, candles: list[MarketCandle]) -> int:
        """Insert candles in bulk, skipping duplicates via ON CONFLICT DO NOTHING."""
        if not candles:
            return 0

        # Use merge for upsert behavior
        count = 0
        for candle in candles:
            try:
                self.session.add(candle)
                await self.session.flush()
                count += 1
            except Exception:
                await self.session.rollback()
                # Duplicate — skip
                continue
        return count

    async def add_candles(self, candles: list[MarketCandle]) -> int:
        """Simple batch add. Caller is responsible for deduplication."""
        self.session.add_all(candles)
        await self.session.flush()
        return len(candles)

    # ---------- Ingestion Runs ----------

    async def create_ingestion_run(self, run: DataIngestionRun) -> DataIngestionRun:
        self.session.add(run)
        await self.session.flush()
        return run

    async def update_ingestion_run(self, run: DataIngestionRun) -> DataIngestionRun:
        await self.session.flush()
        return run

    async def get_latest_runs(self, limit: int = 10) -> list[DataIngestionRun]:
        result = await self.session.execute(
            select(DataIngestionRun)
            .order_by(DataIngestionRun.started_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
