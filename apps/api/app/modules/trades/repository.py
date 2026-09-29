"""
Trade repository — data access layer for trade journal entries.
Supports filtering by symbol (via instrument lookup), date range,
and tag-based queries for analytics.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.instruments.models import Instrument
from app.modules.trades.models import Trade


class TradeRepository:
    """Data access for trade entries."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_trade_by_id(
        self, trade_id: uuid.UUID
    ) -> Optional[Trade]:
        result = await self.session.execute(
            select(Trade).where(Trade.id == trade_id)
        )
        return result.scalar_one_or_none()

    async def list_trades(
        self,
        portfolio_ids: list[uuid.UUID],
        trade_side: Optional[str] = None,
        trade_status: Optional[str] = None,
        strategy_tag: Optional[str] = None,
        portfolio_id: Optional[uuid.UUID] = None,
        instrument_ids: Optional[list[uuid.UUID]] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Trade]:
        stmt = select(Trade).where(Trade.portfolio_id.in_(portfolio_ids))

        if portfolio_id:
            stmt = stmt.where(Trade.portfolio_id == portfolio_id)
        if trade_side:
            stmt = stmt.where(Trade.trade_side == trade_side.upper())
        if trade_status:
            stmt = stmt.where(Trade.trade_status == trade_status.upper())
        if strategy_tag:
            stmt = stmt.where(Trade.strategy_tag == strategy_tag)
        if instrument_ids:
            stmt = stmt.where(Trade.instrument_id.in_(instrument_ids))
        if date_from:
            stmt = stmt.where(Trade.trade_time >= date_from)
        if date_to:
            stmt = stmt.where(Trade.trade_time <= date_to)

        stmt = stmt.order_by(Trade.trade_time.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_all_closed_trades(
        self, portfolio_ids: list[uuid.UUID]
    ) -> list[Trade]:
        """Fetch ALL closed trades for analytics (no pagination)."""
        stmt = (
            select(Trade)
            .where(
                Trade.portfolio_id.in_(portfolio_ids),
                Trade.trade_status == "CLOSED",
            )
            .order_by(Trade.trade_time.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_trades(
        self,
        portfolio_ids: list[uuid.UUID],
        trade_status: Optional[str] = None,
    ) -> int:
        stmt = select(func.count(Trade.id)).where(
            Trade.portfolio_id.in_(portfolio_ids)
        )
        if trade_status:
            stmt = stmt.where(Trade.trade_status == trade_status.upper())
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def create_trade(self, trade: Trade) -> Trade:
        self.session.add(trade)
        await self.session.flush()
        return trade

    async def update_trade(self, trade: Trade) -> Trade:
        await self.session.flush()
        return trade

    async def delete_trade(self, trade: Trade) -> None:
        await self.session.delete(trade)
        await self.session.flush()

    async def find_instrument_ids_by_symbol(
        self, symbol: str
    ) -> list[uuid.UUID]:
        """Look up instrument IDs matching a symbol prefix (for symbol filter)."""
        result = await self.session.execute(
            select(Instrument.id).where(
                Instrument.symbol.ilike(f"%{symbol}%")
            )
        )
        return [row[0] for row in result.all()]
