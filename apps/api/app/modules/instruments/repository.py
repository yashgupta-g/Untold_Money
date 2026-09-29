"""
Instrument repository — data access layer for instruments and exchanges.
"""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.instruments.models import Exchange, Instrument


class InstrumentRepository:
    """Data access for instruments and exchanges."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ---------- Exchange ----------

    async def get_exchange_by_id(self, exchange_id: uuid.UUID) -> Optional[Exchange]:
        result = await self.session.execute(
            select(Exchange).where(Exchange.id == exchange_id)
        )
        return result.scalar_one_or_none()

    async def get_exchange_by_code(self, code: str) -> Optional[Exchange]:
        result = await self.session.execute(
            select(Exchange).where(Exchange.code == code.upper())
        )
        return result.scalar_one_or_none()

    async def list_exchanges(self) -> list[Exchange]:
        result = await self.session.execute(
            select(Exchange).order_by(Exchange.code)
        )
        return list(result.scalars().all())

    async def create_exchange(self, exchange: Exchange) -> Exchange:
        self.session.add(exchange)
        await self.session.flush()
        return exchange

    # ---------- Instrument ----------

    async def get_instrument_by_id(self, instrument_id: uuid.UUID) -> Optional[Instrument]:
        result = await self.session.execute(
            select(Instrument)
            .options(selectinload(Instrument.exchange))
            .where(Instrument.id == instrument_id)
        )
        return result.scalar_one_or_none()

    async def get_instrument_by_symbol(
        self, symbol: str, exchange_code: Optional[str] = None
    ) -> Optional[Instrument]:
        stmt = (
            select(Instrument)
            .options(selectinload(Instrument.exchange))
            .where(Instrument.symbol == symbol.upper())
        )
        if exchange_code:
            stmt = stmt.join(Exchange).where(Exchange.code == exchange_code.upper())
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search_instruments(
        self,
        query: str = "",
        exchange_code: Optional[str] = None,
        instrument_type: Optional[str] = None,
        is_active: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Instrument]:
        stmt = (
            select(Instrument)
            .options(selectinload(Instrument.exchange))
            .where(Instrument.is_active == is_active)
        )

        if query:
            pattern = f"%{query.upper()}%"
            stmt = stmt.where(
                or_(
                    func.upper(Instrument.symbol).like(pattern),
                    func.upper(Instrument.name).like(pattern),
                )
            )

        if exchange_code:
            stmt = stmt.join(Exchange).where(Exchange.code == exchange_code.upper())

        if instrument_type:
            stmt = stmt.where(Instrument.instrument_type == instrument_type.upper())

        stmt = stmt.order_by(Instrument.symbol).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_instruments(
        self,
        query: str = "",
        is_active: bool = True,
    ) -> int:
        stmt = select(func.count(Instrument.id)).where(Instrument.is_active == is_active)
        if query:
            pattern = f"%{query.upper()}%"
            stmt = stmt.where(
                or_(
                    func.upper(Instrument.symbol).like(pattern),
                    func.upper(Instrument.name).like(pattern),
                )
            )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def create_instrument(self, instrument: Instrument) -> Instrument:
        self.session.add(instrument)
        await self.session.flush()
        return instrument

    async def update_instrument(self, instrument: Instrument) -> Instrument:
        await self.session.flush()
        return instrument
