"""
Live prices and day P&L for signed-in users, from their own broker.

One `UserStream` per user, shared by all of that user's browser tabs:
- every couple of seconds in market hours it asks the user's broker for
  quotes on the symbols those tabs watch (plus the user's open positions),
  and sends a `tick` for each symbol whose price or volume moved;
- every 30 seconds it re-reads positions and the connection (status, daily
  loss limit) and sends `pnl`, plus a one-off `risk` event when the day's
  loss crosses the user's own limit.

Ticks go only to the user they belong to (exchange data can't be
rebroadcast). The quote source is pluggable (`SourceFactory`): today it
polls the broker's REST quotes; a broker's own tick socket can replace it
without changing what browsers receive.
"""

from __future__ import annotations

import asyncio
import contextlib
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional, Protocol

from app.core.logging import get_logger
from app.modules.brokers.adapters.base import IST, BrokerAuthExpired, BrokerError, BrokerPosition, BrokerQuote

logger = get_logger(__name__)

MAX_SYMBOLS = 100
QUEUE_SIZE = 500
MARKET_POLL_SECONDS = 2.0
CLOSED_POLL_SECONDS = 30.0
REFRESH_SECONDS = 30.0
RATE_LIMIT_BACKOFF_SECONDS = 15.0
IDLE_GRACE_SECONDS = 30.0


def market_open(now: Optional[datetime] = None) -> bool:
    """NSE cash session, with a few minutes either side (Mon–Fri, IST)."""
    now = (now or datetime.now(timezone.utc)).astimezone(IST)
    minutes = now.hour * 60 + now.minute
    return now.weekday() < 5 and 9 * 60 <= minutes <= 15 * 60 + 40


# ------------------------------------------------------------------ sources


@dataclass
class SourceSettings:
    daily_loss_limit: Optional[float] = None


class LiveSource(Protocol):
    provider: str

    def market_symbol(self, symbol: str) -> Optional[str]: ...

    async def quotes(self, symbols: list[str]) -> list[BrokerQuote]: ...

    async def positions(self) -> list[BrokerPosition]: ...

    async def settings(self) -> Optional[SourceSettings]:
        """Current settings, or None once the connection is gone or expired."""
        ...

    async def record_breach(self, day_pnl: float, limit: float) -> None: ...

    async def aclose(self) -> None: ...


SourceFactory = Callable[[uuid.UUID], Awaitable[Optional[LiveSource]]]


def day_pnl(positions: list[BrokerPosition], prices: dict[str, float]) -> float:
    """Realised P&L plus open positions marked at the latest price."""
    total = 0.0
    for p in positions:
        realized = p.realized_pnl
        if realized is None:
            realized = (p.pnl or 0.0) if not p.net_quantity else 0.0
        unrealized = 0.0
        if p.net_quantity:
            price = prices.get(p.symbol, p.last_price)
            if price is not None:
                unrealized = p.net_quantity * (price - p.average_price)
            elif p.pnl is not None:
                unrealized = p.pnl - realized
        total += realized + unrealized
    return round(total, 2)


# ------------------------------------------------------------------ clients


class Client:
    """One browser tab. Messages queue here; the socket's writer drains them."""

    def __init__(self, user_id: uuid.UUID):
        self.user_id = user_id
        self.symbols: set[str] = set()
        self.queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=QUEUE_SIZE)

    def send(self, message: dict) -> None:
        if self.queue.full():  # a stalled tab drops its oldest messages
            with contextlib.suppress(asyncio.QueueEmpty):
                self.queue.get_nowait()
        self.queue.put_nowait(message)


class UserStream:
    def __init__(self, hub: "StreamHub", user_id: uuid.UUID):
        self.hub = hub
        self.user_id = user_id
        self.clients: set[Client] = set()
        self.task: Optional[asyncio.Task] = None
        self.stop_task: Optional[asyncio.Task] = None
        self.status: dict = {"type": "status", "live": False, "state": "connecting"}
        self.last_ticks: dict[str, dict] = {}  # by UntoldMoney symbol
        self.prices: dict[str, float] = {}  # by broker symbol
        self.positions: list[BrokerPosition] = []
        self.limit: Optional[float] = None
        self.breached = False
        self.pnl_message: Optional[dict] = None

    # -------------------------------------------------------------- messaging

    def broadcast(self, message: dict) -> None:
        for client in self.clients:
            client.send(message)

    def _set_status(self, live: bool, state: str, provider: Optional[str] = None) -> None:
        self.status = {"type": "status", "live": live, "state": state, "provider": provider}
        self.broadcast(self.status)

    def watched(self) -> set[str]:
        return set().union(*(c.symbols for c in self.clients)) if self.clients else set()

    # ------------------------------------------------------------------- loop

    async def run(self) -> None:
        source: Optional[LiveSource] = None
        try:
            source = await self.hub.source_factory(self.user_id)
            if source is None:
                self._set_status(False, "no_connection")
                return
            self._set_status(True, "live", source.provider)
            next_refresh = 0.0
            while True:
                try:
                    if time.monotonic() >= next_refresh:
                        settings = await source.settings()
                        if settings is None:
                            self._set_status(False, "expired", source.provider)
                            return
                        self.limit = settings.daily_loss_limit
                        self.positions = await source.positions()
                        next_refresh = time.monotonic() + self.hub.refresh_seconds
                    await self._poll(source)
                    await self._update_pnl(source)
                except BrokerAuthExpired:
                    self._set_status(False, "expired", source.provider)
                    return
                except BrokerError as exc:
                    logger.warning("stream_broker_error", user_id=str(self.user_id), error=str(exc))
                    await asyncio.sleep(self.hub.backoff_seconds)
                    continue
                await asyncio.sleep(self.hub.poll_interval())
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # never leave a half-dead stream behind silently
            logger.error("stream_failed", user_id=str(self.user_id), error=repr(exc))
            self._set_status(False, "error")
        finally:
            if source is not None:
                with contextlib.suppress(Exception):
                    await source.aclose()

    async def _poll(self, source: LiveSource) -> None:
        names: dict[str, str] = {}  # broker symbol → our symbol
        for symbol in self.watched():
            mapped = source.market_symbol(symbol)
            if mapped:
                names[mapped] = symbol
        wanted = set(names) | {p.symbol for p in self.positions if p.net_quantity}
        if not wanted:
            return
        for q in await source.quotes(sorted(wanted)):
            moved = self.prices.get(q.symbol) != q.price
            self.prices[q.symbol] = q.price
            ours = names.get(q.symbol)
            if not ours:
                continue
            previous = self.last_ticks.get(ours)
            if not moved and previous and previous["volume"] == q.volume:
                continue
            tick = {
                "type": "tick",
                "symbol": ours,
                "ltp": q.price,
                "ch": q.change,
                "chp": q.change_percent,
                "volume": q.volume,
                "ts": q.timestamp.isoformat(),
                "provider": source.provider,
            }
            self.last_ticks[ours] = tick
            for client in self.clients:
                if ours in client.symbols:
                    client.send(tick)

    async def _update_pnl(self, source: LiveSource) -> None:
        if not self.positions and self.limit is None:
            return
        pnl = day_pnl(self.positions, self.prices)
        breached = self.limit is not None and pnl <= -self.limit
        message = {
            "type": "pnl",
            "day_pnl": pnl,
            "limit": self.limit,
            "breached": breached,
            "open_positions": sum(1 for p in self.positions if p.net_quantity),
        }
        if message != self.pnl_message:
            self.pnl_message = message
            self.broadcast(message)
        if breached and not self.breached:
            self.broadcast({"type": "risk", "breached": True, "limit": self.limit, "day_pnl": pnl})
            with contextlib.suppress(Exception):
                await source.record_breach(pnl, self.limit)  # type: ignore[arg-type]
        self.breached = breached


# --------------------------------------------------------------------- hub


class StreamHub:
    def __init__(
        self,
        source_factory: Optional[SourceFactory] = None,
        *,
        idle_grace: float = IDLE_GRACE_SECONDS,
        poll_seconds: Optional[float] = None,
        refresh_seconds: float = REFRESH_SECONDS,
        backoff_seconds: float = RATE_LIMIT_BACKOFF_SECONDS,
    ):
        self.source_factory: SourceFactory = source_factory or broker_source
        self.idle_grace = idle_grace
        self._poll_seconds = poll_seconds
        self.refresh_seconds = refresh_seconds
        self.backoff_seconds = backoff_seconds
        self.streams: dict[uuid.UUID, UserStream] = {}

    def poll_interval(self) -> float:
        if self._poll_seconds is not None:
            return self._poll_seconds
        return MARKET_POLL_SECONDS if market_open() else CLOSED_POLL_SECONDS

    async def attach(self, user_id: uuid.UUID) -> Client:
        stream = self.streams.get(user_id)
        if stream is None:
            stream = self.streams[user_id] = UserStream(self, user_id)
        if stream.stop_task:
            stream.stop_task.cancel()
            stream.stop_task = None
        client = Client(user_id)
        stream.clients.add(client)
        client.send(stream.status)
        if stream.pnl_message:
            client.send(stream.pnl_message)
        if stream.task is None or stream.task.done():
            stream.task = asyncio.create_task(stream.run())
        return client

    def subscribe(self, client: Client, symbols: list[str]) -> list[str]:
        """Add symbols for this tab; returns the ones refused (over the limit)."""
        stream = self.streams.get(client.user_id)
        if not stream:
            return symbols
        watched = stream.watched()
        refused: list[str] = []
        for symbol in symbols:
            if symbol in client.symbols:
                continue
            if symbol not in watched and len(watched) >= MAX_SYMBOLS:
                refused.append(symbol)
                continue
            client.symbols.add(symbol)
            watched.add(symbol)
            if symbol in stream.last_ticks:  # a new tab sees prices at once
                client.send(stream.last_ticks[symbol])
        return refused

    def unsubscribe(self, client: Client, symbols: list[str]) -> None:
        client.symbols.difference_update(symbols)

    async def detach(self, client: Client) -> None:
        stream = self.streams.get(client.user_id)
        if not stream:
            return
        stream.clients.discard(client)
        if not stream.clients and stream.stop_task is None:
            stream.stop_task = asyncio.create_task(self._stop_when_idle(stream))

    async def _stop_when_idle(self, stream: UserStream) -> None:
        await asyncio.sleep(self.idle_grace)
        if stream.clients:
            return
        if self.streams.get(stream.user_id) is stream:
            del self.streams[stream.user_id]
        if stream.task:
            stream.task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await stream.task

    async def shutdown(self) -> None:
        for stream in list(self.streams.values()):
            for task in (stream.task, stream.stop_task):
                if task:
                    task.cancel()
                    with contextlib.suppress(asyncio.CancelledError, Exception):
                        await task
        self.streams.clear()


# --------------------------------------------------- the real broker source


class BrokerLiveSource:
    """A user's active market-data broker connection, polled over REST."""

    def __init__(
        self,
        connection_id: uuid.UUID,
        user_id: uuid.UUID,
        adapter,
        tokens,
        provider: str,
        indices: Optional[set[str]] = None,
    ):
        self.connection_id = connection_id
        self.user_id = user_id
        self.adapter = adapter
        self.tokens = tokens
        self.provider = provider
        self.indices = indices or set()

    def market_symbol(self, symbol: str) -> Optional[str]:
        # Instruments are NSE-listed (Fyers symbol master); indices by name.
        kind = "INDEX" if symbol in self.indices else "EQUITY"
        return self.adapter.market_symbol(symbol, "NSE", kind)

    async def quotes(self, symbols: list[str]) -> list[BrokerQuote]:
        try:
            return await self.adapter.quotes(self.tokens, symbols)
        except BrokerAuthExpired:
            await self._mark_expired()
            raise

    async def positions(self) -> list[BrokerPosition]:
        try:
            return await self.adapter.positions(self.tokens)
        except BrokerAuthExpired:
            await self._mark_expired()
            raise

    async def settings(self) -> Optional[SourceSettings]:
        from app.core.database import get_session_factory
        from app.modules.brokers.models import BrokerConnection

        async with get_session_factory()() as session:
            conn = await session.get(BrokerConnection, self.connection_id)
            now = datetime.now(timezone.utc)
            if (
                not conn
                or conn.status != "active"
                or (conn.token_expires_at and conn.token_expires_at <= now)
            ):
                return None
            limit = conn.daily_loss_limit
            return SourceSettings(daily_loss_limit=float(limit) if limit is not None else None)

    async def record_breach(self, day_pnl: float, limit: float) -> None:
        from app.core.database import get_session_factory
        from app.modules.audit.service import AuditService

        async with get_session_factory()() as session:
            await AuditService(session).log_event(
                action="risk.daily_loss_breached",
                entity_type="broker_connection",
                entity_id=str(self.connection_id),
                actor_user_id=self.user_id,
                metadata={"day_pnl": day_pnl, "limit": limit},
            )
            await session.commit()

    async def _mark_expired(self) -> None:
        from sqlalchemy import update

        from app.core.database import get_session_factory
        from app.modules.brokers.models import BrokerConnection

        with contextlib.suppress(Exception):
            async with get_session_factory()() as session:
                await session.execute(
                    update(BrokerConnection)
                    .where(BrokerConnection.id == self.connection_id)
                    .values(status="expired", last_error="Your session has ended. Reconnect to continue.")
                )
                await session.commit()

    async def aclose(self) -> None:
        await self.adapter.aclose()


async def broker_source(user_id: uuid.UUID) -> Optional[LiveSource]:
    from app.core.database import get_session_factory
    from app.modules.brokers.market import BrokerMarketData

    from sqlalchemy import select

    from app.modules.instruments.models import Instrument

    async with get_session_factory()() as session:
        market = await BrokerMarketData.for_user(session, user_id)
        if market is None:
            return None
        indices = set(
            (
                await session.execute(select(Instrument.symbol).where(Instrument.instrument_type == "INDEX"))
            ).scalars()
        )
        return BrokerLiveSource(
            market.conn.id, user_id, market.adapter, market.tokens, market.provider, indices
        )
