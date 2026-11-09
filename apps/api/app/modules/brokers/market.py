"""
Market data through a user's own broker connection — the only source.

Quotes, candles (intraday to weekly) and everything computed from them
(indicators, scores, predictions, portfolio and paper prices) come from the
viewer's own connection to a broker that offers market data (Fyers today).
Without one, callers raise BrokerRequiredException and the app asks the user
to connect.

Compliance: this data belongs to that user's broker session. It's cached
under per-user Redis keys only, never stored in the database, and never
sent to anyone else.
"""

from __future__ import annotations

import json
import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import BrokerRequiredException
from app.core.logging import get_logger
from app.modules.brokers.adapters import ADAPTERS
from app.modules.brokers.adapters.base import (
    IST,
    BrokerAdapter,
    BrokerAuthExpired,
    BrokerCandle,
    BrokerError,
    BrokerQuote,
    TokenBundle,
)
from app.modules.brokers.models import BrokerConnection
from app.modules.instruments.models import Exchange, Instrument
from app.modules.market_data.schemas import CandleResponse, QuoteResponse

logger = get_logger(__name__)

QUOTE_TTL_SECONDS = 5
INTRADAY_CANDLE_TTL_SECONDS = 60
DAILY_CANDLE_TTL_SECONDS = 15 * 60

# Minutes per candle, and NSE's 375-minute session for sizing a lookback.
_MINUTES = {"1m": 1, "5m": 5, "15m": 15, "1h": 60, "4h": 240}
_SESSION_MINUTES = 375


def market_data_brokers() -> set[str]:
    return {name for name, cls in ADAPTERS.items() if cls.supports_market_data}


def lookback(interval: str, limit: int) -> timedelta:
    """How far back to ask for `limit` candles, allowing for nights and weekends."""
    if interval in _MINUTES:
        per_day = max(1, _SESSION_MINUTES // _MINUTES[interval])
        trading_days = math.ceil(limit / per_day)
    elif interval == "1w":
        trading_days = limit * 5
    else:  # 1d
        trading_days = limit
    return timedelta(days=math.ceil(trading_days * 7 / 5) + 4)


def to_weekly(candles: list[BrokerCandle]) -> list[BrokerCandle]:
    """Group daily candles into weeks (Monday-start, IST)."""
    weeks: dict[tuple[int, int], list[BrokerCandle]] = {}
    for c in candles:
        year, week, _ = c.time.astimezone(IST).isocalendar()
        weeks.setdefault((year, week), []).append(c)
    return [
        BrokerCandle(
            time=group[0].time,
            open=group[0].open,
            high=max(c.high for c in group),
            low=min(c.low for c in group),
            close=group[-1].close,
            volume=sum(c.volume for c in group),
        )
        for _, group in sorted(weeks.items())
    ]


def _redis() -> Redis:
    return Redis.from_url(get_settings().REDIS_URL, decode_responses=True, socket_timeout=0.5)


class BrokerMarketData:
    """One user's broker connection, used as a market-data source."""

    def __init__(
        self,
        session: AsyncSession,
        conn: BrokerConnection,
        adapter: BrokerAdapter,
        tokens: TokenBundle,
    ):
        self.session = session
        self.conn = conn
        self.adapter = adapter
        self.tokens = tokens
        self.provider = conn.broker
        self._redis: Optional[Redis] = None
        self._exchanges: Optional[dict[uuid.UUID, str]] = None

    # ----------------------------------------------------------------- lifecycle

    @classmethod
    async def for_user(
        cls, session: AsyncSession, user_id: Optional[uuid.UUID]
    ) -> Optional["BrokerMarketData"]:
        """The user's live source, or None (no connection, expired, or unsupported)."""
        if not user_id:
            return None
        from app.modules.brokers.service import BrokerService

        now = datetime.now(timezone.utc)
        conns = (
            await session.execute(
                select(BrokerConnection).where(
                    BrokerConnection.user_id == user_id,
                    BrokerConnection.status == "active",
                    BrokerConnection.broker.in_(market_data_brokers()),
                    BrokerConnection.access_token_enc.is_not(None),
                )
            )
        ).scalars().all()
        for conn in conns:
            if conn.token_expires_at and conn.token_expires_at <= now:
                continue
            service = BrokerService(session)
            try:
                return cls(session, conn, service.adapter(conn.broker, conn), service._tokens(conn))
            except Exception as exc:  # misconfigured app or undecryptable token
                logger.warning("broker_market_data_unavailable", broker=conn.broker, error=str(exc))
        return None

    async def aclose(self) -> None:
        await self.adapter.aclose()
        if self._redis is not None:
            await self._redis.aclose()

    # ----------------------------------------------------------------- helpers

    async def _exchange_code(self, instrument: Instrument) -> str:
        if self._exchanges is None:
            rows = (await self.session.execute(select(Exchange.id, Exchange.code))).all()
            self._exchanges = {row.id: row.code for row in rows}
        return self._exchanges.get(instrument.exchange_id, "NSE")

    async def _symbol(self, instrument: Instrument) -> Optional[str]:
        return self.adapter.market_symbol(
            instrument.symbol, await self._exchange_code(instrument), instrument.instrument_type
        )

    def _cache(self) -> Redis:
        if self._redis is None:
            self._redis = _redis()
        return self._redis

    async def _cache_get(self, key: str) -> Optional[str]:
        try:
            return await self._cache().get(key)
        except (RedisError, OSError):
            return None

    async def _cache_set(self, key: str, value: str, ttl: int) -> None:
        try:
            await self._cache().set(key, value, ex=ttl)
        except (RedisError, OSError):
            pass

    @property
    def expired(self) -> bool:
        return self.conn.status == "expired"

    def _key(self, kind: str, *parts) -> str:
        # Per user: one user's broker data is never served to another.
        return ":".join([kind, str(self.conn.user_id), *map(str, parts)])

    async def _guard(self, call):
        """Run a broker call. Expired tokens mark the connection; errors fall back."""
        try:
            return await call
        except BrokerAuthExpired as exc:
            self.conn.status = "expired"
            self.conn.last_error = str(exc)
            await self.session.flush()
            logger.info("broker_market_data_expired", broker=self.conn.broker)
        except (BrokerError, OSError, ValueError) as exc:
            logger.warning("broker_market_data_failed", broker=self.conn.broker, error=str(exc))
        except Exception as exc:  # network errors from httpx and the like
            logger.warning("broker_market_data_failed", broker=self.conn.broker, error=repr(exc))
        return None

    # ------------------------------------------------------------------ quotes

    async def quotes(self, instruments: list[Instrument]) -> dict[uuid.UUID, QuoteResponse]:
        """Live quotes keyed by instrument ID. Missing entries mean "use the fallback"."""
        wanted: dict[str, list[Instrument]] = {}
        for inst in instruments:
            sym = await self._symbol(inst)
            if sym:
                wanted.setdefault(sym, []).append(inst)

        found: dict[str, QuoteResponse] = {}
        to_fetch: list[str] = []
        for sym, insts in wanted.items():
            cached = await self._cache_get(self._key("mq", sym))
            if cached:
                found[sym] = QuoteResponse.model_validate_json(cached)
            else:
                to_fetch.append(sym)

        if to_fetch:
            fetched = await self._guard(self.adapter.quotes(self.tokens, to_fetch))
            for q in fetched or []:
                insts = wanted.get(q.symbol)
                if not insts:
                    continue
                quote = self._quote_response(insts[0].symbol, q)
                found[q.symbol] = quote
                await self._cache_set(self._key("mq", q.symbol), quote.model_dump_json(), QUOTE_TTL_SECONDS)

        return {inst.id: found[sym] for sym, insts in wanted.items() if sym in found for inst in insts}

    def _quote_response(self, symbol: str, q: BrokerQuote) -> QuoteResponse:
        return QuoteResponse(
            symbol=symbol,
            price=q.price,
            change=q.change,
            change_percent=q.change_percent,
            high=q.high if q.high is not None else q.price,
            low=q.low if q.low is not None else q.price,
            open=q.open if q.open is not None else q.price,
            previous_close=q.previous_close if q.previous_close is not None else q.price - q.change,
            volume=q.volume,
            timestamp=q.timestamp,
            provider=self.provider,
        )

    # ----------------------------------------------------------------- candles

    async def candles(
        self,
        instrument: Instrument,
        interval: str,
        start: Optional[datetime],
        end: Optional[datetime],
        limit: int,
    ) -> Optional[list[CandleResponse]]:
        """The latest `limit` candles in [start, end], oldest first, or None to fall back."""
        sym = await self._symbol(instrument)
        if not sym:
            return None
        end = end or datetime.now(timezone.utc)
        start = start or end - lookback(interval, limit)
        key = self._key("mc", sym, interval, limit, int(start.timestamp()) // 60, int(end.timestamp()) // 60)
        cached = await self._cache_get(key)
        if cached:
            return [CandleResponse.model_validate(row) for row in json.loads(cached)]

        fetch_interval = "1d" if interval == "1w" else interval
        rows = await self._guard(self.adapter.history(self.tokens, sym, fetch_interval, start, end))
        if rows is None:
            return None
        if interval == "1w":
            rows = to_weekly(rows)
        rows = rows[-limit:]
        result = [
            CandleResponse(
                instrument_id=instrument.id,
                symbol=instrument.symbol,
                candle_time=c.time,
                interval=interval,
                open=c.open,
                high=c.high,
                low=c.low,
                close=c.close,
                volume=c.volume,
                provider=self.provider,
            )
            for c in rows
        ]
        ttl = INTRADAY_CANDLE_TTL_SECONDS if interval in _MINUTES else DAILY_CANDLE_TTL_SECONDS
        await self._cache_set(key, json.dumps([c.model_dump(mode="json") for c in result]), ttl)
        return result


# ---------------------------------------------------------------- shortcuts


async def broker_quotes(
    session: AsyncSession, user_id: Optional[uuid.UUID], instruments: list[Instrument]
) -> dict[uuid.UUID, QuoteResponse]:
    """Live quotes for whatever the user's broker can price; {} if no live source."""
    if not instruments:
        return {}
    source = await BrokerMarketData.for_user(session, user_id)
    if not source:
        return {}
    try:
        return await source.quotes(instruments)
    finally:
        await source.aclose()


async def require_market_data(session: AsyncSession, user_id: Optional[uuid.UUID]) -> BrokerMarketData:
    """The user's live source, or BrokerRequiredException. Close it when done."""
    source = await BrokerMarketData.for_user(session, user_id)
    if source is None:
        raise BrokerRequiredException()
    return source


async def ensure_market_data(session: AsyncSession, user_id: Optional[uuid.UUID]) -> None:
    """Gate a feature on a live broker connection without fetching anything."""
    source = await require_market_data(session, user_id)
    await source.aclose()


async def daily_candles(
    session: AsyncSession, user_id: Optional[uuid.UUID], instrument: Instrument, limit: int = 200
) -> list[CandleResponse]:
    """The latest `limit` daily candles from the user's broker, oldest first."""
    source = await require_market_data(session, user_id)
    try:
        candles = await source.candles(instrument, "1d", None, None, limit)
        if candles is None and source.expired:
            raise BrokerRequiredException(
                "Your Fyers session has ended. Reconnect to see live data.", "BROKER_SESSION_EXPIRED"
            )
        return candles or []
    finally:
        await source.aclose()
