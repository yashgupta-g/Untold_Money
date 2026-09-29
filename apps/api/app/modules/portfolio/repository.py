"""
Portfolio repository — data access layer for portfolios, holdings, and price lookups.
"""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.market_data.models import MarketCandle
from app.modules.portfolio.models import Holding, Portfolio


class PortfolioRepository:
    """Data access for portfolios and holdings."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ---------- Portfolio ----------

    async def get_portfolio_by_id(
        self, portfolio_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[Portfolio]:
        result = await self.session.execute(
            select(Portfolio)
            .options(selectinload(Portfolio.holdings))
            .where(Portfolio.id == portfolio_id, Portfolio.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_portfolios(self, user_id: uuid.UUID) -> list[Portfolio]:
        result = await self.session.execute(
            select(Portfolio)
            .options(selectinload(Portfolio.holdings))
            .where(Portfolio.user_id == user_id)
            .order_by(Portfolio.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_portfolio(self, portfolio: Portfolio) -> Portfolio:
        self.session.add(portfolio)
        await self.session.flush()
        return portfolio

    async def update_portfolio(self, portfolio: Portfolio) -> Portfolio:
        await self.session.flush()
        return portfolio

    async def delete_portfolio(self, portfolio: Portfolio) -> None:
        await self.session.delete(portfolio)
        await self.session.flush()

    async def count_portfolios(self, user_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.count(Portfolio.id)).where(Portfolio.user_id == user_id)
        )
        return result.scalar_one()

    # ---------- Holding ----------

    async def get_holding_by_id(
        self, holding_id: uuid.UUID, portfolio_id: uuid.UUID
    ) -> Optional[Holding]:
        result = await self.session.execute(
            select(Holding).where(
                Holding.id == holding_id,
                Holding.portfolio_id == portfolio_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_holding_by_instrument(
        self, portfolio_id: uuid.UUID, instrument_id: uuid.UUID
    ) -> Optional[Holding]:
        result = await self.session.execute(
            select(Holding).where(
                Holding.portfolio_id == portfolio_id,
                Holding.instrument_id == instrument_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_holdings(self, portfolio_id: uuid.UUID) -> list[Holding]:
        result = await self.session.execute(
            select(Holding)
            .where(Holding.portfolio_id == portfolio_id)
            .order_by(Holding.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_holding(self, holding: Holding) -> Holding:
        self.session.add(holding)
        await self.session.flush()
        return holding

    async def update_holding(self, holding: Holding) -> Holding:
        await self.session.flush()
        return holding

    async def delete_holding(self, holding: Holding) -> None:
        await self.session.delete(holding)
        await self.session.flush()

    # ---------- Market Price Lookup ----------

    async def get_latest_candle_price(self, instrument_id: uuid.UUID) -> Optional[float]:
        """
        Get the latest available daily candle close price for an instrument.
        Returns None if no candle data exists in the database.
        """
        result = await self.session.execute(
            select(MarketCandle.close)
            .where(
                MarketCandle.instrument_id == instrument_id,
                MarketCandle.interval == "1d",
            )
            .order_by(MarketCandle.candle_time.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        return float(row) if row is not None else None

    async def get_latest_candle_prices(
        self, instrument_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, float]:
        """
        Batch-fetch latest daily candle close prices for multiple instruments.
        Returns a dict of instrument_id → close price.
        """
        if not instrument_ids:
            return {}

        # Subquery: latest candle_time per instrument
        latest_subq = (
            select(
                MarketCandle.instrument_id,
                func.max(MarketCandle.candle_time).label("max_time"),
            )
            .where(
                MarketCandle.instrument_id.in_(instrument_ids),
                MarketCandle.interval == "1d",
            )
            .group_by(MarketCandle.instrument_id)
            .subquery()
        )

        # Join to get the close price at that max time
        result = await self.session.execute(
            select(MarketCandle.instrument_id, MarketCandle.close)
            .join(
                latest_subq,
                (MarketCandle.instrument_id == latest_subq.c.instrument_id)
                & (MarketCandle.candle_time == latest_subq.c.max_time),
            )
            .where(MarketCandle.interval == "1d")
        )

        return {row.instrument_id: float(row.close) for row in result.all()}
