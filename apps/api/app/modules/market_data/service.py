"""
Market data service — quotes and candles from the user's own broker.

There is no shared or delayed fallback: market data belongs to a user's
broker session (see brokers/market.py). Without a live connection the API
answers 428 BROKER_REQUIRED and the app asks the user to connect.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, BrokerRequiredException, NotFoundException
from app.modules.brokers.market import require_market_data
from app.modules.instruments.master import ensure_instrument
from app.modules.instruments.models import Instrument
from app.modules.market_data.schemas import CandleResponse, QuoteResponse

MAX_BATCH = 50

_EXPIRED = BrokerRequiredException(
    "Your Fyers session has ended. Reconnect to see live data.", "BROKER_SESSION_EXPIRED"
)


class MarketDataService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def instrument(self, symbol: str) -> Instrument:
        instrument = await ensure_instrument(self.session, symbol)
        if not instrument:
            raise NotFoundException(f"'{symbol.upper()}' isn't listed on NSE")
        return instrument

    async def get_quote(self, symbol: str, user_id: Optional[uuid.UUID]) -> QuoteResponse:
        source = await require_market_data(self.session, user_id)
        try:
            instrument = await self.instrument(symbol)
            quotes = await source.quotes([instrument])
            if instrument.id in quotes:
                return quotes[instrument.id]
            if source.expired:
                raise _EXPIRED
            raise BadRequestException(
                f"Couldn't get a price for {instrument.symbol} from your broker right now.",
                error_code="QUOTE_UNAVAILABLE",
            )
        finally:
            await source.aclose()

    async def get_quotes(self, symbols: list[str], user_id: Optional[uuid.UUID]) -> dict[str, QuoteResponse]:
        """Quotes for many symbols in one broker call; unknown symbols are left out."""
        wanted = list(dict.fromkeys(s.strip().upper() for s in symbols if s.strip()))[:MAX_BATCH]
        source = await require_market_data(self.session, user_id)
        try:
            instruments = (
                await self.session.execute(select(Instrument).where(Instrument.symbol.in_(wanted)))
            ).scalars().all()
            quotes = await source.quotes(list(instruments))
            if not quotes and instruments and source.expired:
                raise _EXPIRED
            return {q.symbol: q for q in quotes.values()}
        finally:
            await source.aclose()

    async def get_candles(
        self,
        symbol: str,
        user_id: Optional[uuid.UUID],
        interval: str = "1d",
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 200,
    ) -> list[CandleResponse]:
        source = await require_market_data(self.session, user_id)
        try:
            instrument = await self.instrument(symbol)
            candles = await source.candles(instrument, interval, start, end, limit)
            if candles is None and source.expired:
                raise _EXPIRED
            return candles or []
        finally:
            await source.aclose()
