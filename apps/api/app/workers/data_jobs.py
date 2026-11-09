"""
Reference-data jobs.

Only the list of tradable instruments is kept here, from Fyers's public NSE
symbol master. Prices and candles are never stored: they come live from
each user's own broker connection (see modules/brokers/market.py).
"""

from __future__ import annotations

import asyncio

from app.core.logging import get_logger
from app.workers.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(name="data_jobs.sync_instruments", soft_time_limit=240, time_limit=300)
def sync_instruments() -> dict:
    """Add NSE stocks and indices that aren't in the instruments table yet."""
    return asyncio.run(_sync_instruments())


async def _sync_instruments() -> dict:
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    from app.core.config import get_settings
    from app.modules.instruments.master import load_master, sync_instruments as sync

    engine = create_async_engine(get_settings().DATABASE_URL, poolclass=NullPool)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        rows = await load_master(force=True)
        async with factory() as session:
            added = await sync(session, rows)
            await session.commit()
    finally:
        await engine.dispose()
    logger.info("instrument_sync_done", added=added, listed=len(rows))
    return {"added": added, "listed": len(rows)}
