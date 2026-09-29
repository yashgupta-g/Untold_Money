"""
Instrument service — business logic for instrument and exchange management.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.core.logging import get_logger
from app.modules.audit.service import AuditService
from app.modules.instruments.models import Exchange, Instrument
from app.modules.instruments.repository import InstrumentRepository
from app.modules.instruments.schemas import (
    InstrumentCreateRequest,
    InstrumentResponse,
    InstrumentUpdateRequest,
    ExchangeCreateRequest,
    ExchangeResponse,
)

logger = get_logger(__name__)


class InstrumentService:
    """Business logic for instruments and exchanges."""

    def __init__(self, session: AsyncSession):
        self.repo = InstrumentRepository(session)
        self.audit = AuditService(session)

    # ---------- Exchange ----------

    async def list_exchanges(self) -> list[ExchangeResponse]:
        exchanges = await self.repo.list_exchanges()
        return [ExchangeResponse.model_validate(e) for e in exchanges]

    async def create_exchange(
        self,
        data: ExchangeCreateRequest,
        actor_user_id: Optional[uuid.UUID] = None,
    ) -> ExchangeResponse:
        existing = await self.repo.get_exchange_by_code(data.code)
        if existing:
            raise ConflictException(f"Exchange '{data.code}' already exists")

        exchange = Exchange(
            code=data.code.upper(),
            name=data.name,
            country=data.country,
        )
        exchange = await self.repo.create_exchange(exchange)
        logger.info("exchange_created", code=exchange.code)

        await self.audit.log_event(
            action="CREATE_EXCHANGE",
            entity_type="EXCHANGE",
            entity_id=str(exchange.id),
            actor_user_id=actor_user_id,
            details=f"Created exchange {exchange.code}",
        )

        return ExchangeResponse.model_validate(exchange)

    # ---------- Instrument ----------

    async def list_instruments(
        self,
        query: str = "",
        exchange_code: str = None,
        instrument_type: str = None,
        is_active: bool = True,
        limit: int = 50,   
        offset: int = 0,
    ) -> list[InstrumentResponse]:
        instruments = await self.repo.search_instruments(
            query=query,
            exchange_code=exchange_code,
            instrument_type=instrument_type,
            is_active=is_active,
            limit=limit,
            offset=offset,
        )
        return [InstrumentResponse.model_validate(i) for i in instruments]

    async def search_instruments(self, q: str, limit: int = 20) -> list[InstrumentResponse]:
        instruments = await self.repo.search_instruments(query=q, limit=limit)
        return [InstrumentResponse.model_validate(i) for i in instruments]

    async def get_instrument_by_symbol(self, symbol: str) -> InstrumentResponse:
        instrument = await self.repo.get_instrument_by_symbol(symbol.upper())
        if not instrument:
            raise NotFoundException(f"Instrument '{symbol}' not found")
        return InstrumentResponse.model_validate(instrument)

    async def create_instrument(
        self,
        data: InstrumentCreateRequest,
        actor_user_id: Optional[uuid.UUID] = None,
    ) -> InstrumentResponse:
        # Verify exchange exists
        exchange = await self.repo.get_exchange_by_id(data.exchange_id)
        if not exchange:
            raise NotFoundException("Exchange not found")

        # Check for duplicate
        existing = await self.repo.get_instrument_by_symbol(data.symbol, exchange.code)
        if existing:
            raise ConflictException(f"Instrument '{data.symbol}' already exists on {exchange.code}")

        instrument = Instrument(
            exchange_id=data.exchange_id,
            symbol=data.symbol.upper(),
            name=data.name,
            instrument_type=data.instrument_type.upper(),
            isin=data.isin,
            sector=data.sector,
            industry=data.industry,
            currency=data.currency.upper(),
            is_active=data.is_active,
        )
        instrument = await self.repo.create_instrument(instrument)
        logger.info("instrument_created", symbol=instrument.symbol)

        await self.audit.log_event(
            action="CREATE_INSTRUMENT",
            entity_type="INSTRUMENT",
            entity_id=str(instrument.id),
            actor_user_id=actor_user_id,
            details=f"Created instrument {instrument.symbol} on {exchange.code}",
        )

        # Re-fetch with exchange eagerly loaded
        full = await self.repo.get_instrument_by_id(instrument.id)
        return InstrumentResponse.model_validate(full)

    async def update_instrument(
        self,
        instrument_id: uuid.UUID,
        data: InstrumentUpdateRequest,
        actor_user_id: Optional[uuid.UUID] = None,
    ) -> InstrumentResponse:
        instrument = await self.repo.get_instrument_by_id(instrument_id)
        if not instrument:
            raise NotFoundException("Instrument not found")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(instrument, field, value)

        instrument = await self.repo.update_instrument(instrument)
        logger.info("instrument_updated", symbol=instrument.symbol, id=str(instrument_id))

        await self.audit.log_event(
            action="UPDATE_INSTRUMENT",
            entity_type="INSTRUMENT",
            entity_id=str(instrument.id),
            actor_user_id=actor_user_id,
            details=f"Updated instrument {instrument.symbol}",
            metadata=update_data,
        )

        return InstrumentResponse.model_validate(instrument)
