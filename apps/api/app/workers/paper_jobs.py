"""
Paper trading background jobs.
"""

from __future__ import annotations

import asyncio

from app.core.logging import get_logger
from app.workers.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(name="paper_jobs.match_open_orders", soft_time_limit=240, time_limit=300)
def match_open_orders() -> dict:
    """
    Fill resting paper limit orders whose price has been reached, for
    accounts nobody is looking at. (Reading an account also matches.)
    """
    return asyncio.run(_match_open_orders())


async def _match_open_orders() -> dict:
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    from app.core.config import get_settings
    from app.modules.paper.models import PaperAccount, PaperOrder
    from app.modules.paper.service import PaperService

    engine = create_async_engine(get_settings().DATABASE_URL, poolclass=NullPool)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    filled = 0
    try:
        async with factory() as session:
            account_ids = (
                await session.execute(
                    select(PaperOrder.account_id).where(PaperOrder.status == "OPEN").distinct()
                )
            ).scalars().all()
        for account_id in account_ids:
            async with factory() as session:
                try:
                    account = await session.get(PaperAccount, account_id)
                    if account:
                        filled += await PaperService(session, user_id=account.user_id).match_open_orders(account)
                        await session.commit()
                except Exception as exc:  # one account must not stop the rest
                    await session.rollback()
                    logger.warning("paper_match_failed", account_id=str(account_id), error=str(exc))
    finally:
        await engine.dispose()
    logger.info("paper_match_done", accounts=len(account_ids), filled=filled)
    return {"accounts": len(account_ids), "filled": filled}
