"""
Broker connections: link, sync, snapshot, disconnect. Read-only.

Linking: `start_connect` stores a one-time state in Redis (10 minutes) and the
router also sets it in a short-lived httpOnly cookie. The broker redirects the
browser back to our callback; the state must match both, which ties the
callback to the user who started it and blocks login-CSRF.

Sync mirrors the broker account into a portfolio of kind "broker":
- holdings are replaced wholesale (the broker is the source of truth)
- today's trade-book fills go to the journal through trades/fills.py, once
  each, with the broker's average cost used for sells of shares bought
  before linking.
"""

from __future__ import annotations

import json
import re
import secrets
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Optional

from redis.asyncio import Redis
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging import get_logger
from app.modules.audit.service import AuditService
from app.modules.brokers import crypto
from app.modules.brokers.adapters import ADAPTERS, get_adapter
from app.modules.brokers.adapters.base import (
    AppCredentials,
    BrokerAdapter,
    BrokerAuthExpired,
    BrokerError,
    TokenBundle,
)
from app.modules.brokers.models import BrokerConnection
from app.modules.brokers.symbols import to_instrument_symbol
from app.modules.instruments.models import Instrument
from app.modules.instruments.repository import InstrumentRepository
from app.modules.portfolio.models import Holding, Portfolio
from app.modules.trades.fills import Fill, record_fill

logger = get_logger(__name__)

STATE_TTL_SECONDS = 600

# Shapes of each broker's developer-app credentials, to catch paste mistakes.
_APP_ID_FORMAT = {
    "fyers": re.compile(r"^[A-Z0-9]{4,24}-\d{3}$"),  # e.g. ABCD1234-100
    "angelone": re.compile(r"^[A-Za-z0-9]{6,64}$"),
}
_SECRET_FORMAT = re.compile(r"^\S{6,128}$")


def _mask(value: str) -> str:
    return f"{value[:4]}…{value[-4:]}" if len(value) > 10 else "…" + value[-3:]


def redirect_uri(broker: str) -> str:
    settings = get_settings()
    return f"{settings.API_PUBLIC_URL.rstrip('/')}/api/{settings.API_VERSION}/brokers/{broker}/callback"


def _redis() -> Redis:
    return Redis.from_url(get_settings().REDIS_URL, decode_responses=True)


class BrokerService:
    def __init__(self, session: AsyncSession, adapter: Optional[BrokerAdapter] = None):
        self.session = session
        self.audit = AuditService(session)
        self.instruments = InstrumentRepository(session)
        self._adapter = adapter

    def adapter(self, broker: str, conn: Optional[BrokerConnection] = None) -> BrokerAdapter:
        """The user's own developer app if they've added one, else the platform's."""
        return self._adapter or get_adapter(broker, self._own_credentials(conn))

    @staticmethod
    def _own_credentials(conn: Optional[BrokerConnection]) -> Optional[AppCredentials]:
        if not conn or not conn.app_id_enc:
            return None
        app_id = crypto.decrypt(conn.app_id_enc)
        if not app_id:
            return None
        return AppCredentials(app_id=app_id, app_secret=crypto.decrypt(conn.app_secret_enc))

    async def _find(self, user_id: uuid.UUID, broker: str) -> Optional[BrokerConnection]:
        return await self.session.scalar(
            select(BrokerConnection).where(
                BrokerConnection.user_id == user_id, BrokerConnection.broker == broker
            )
        )

    # ------------------------------------------------------------------ catalogue

    async def overview(self, user_id: uuid.UUID) -> dict:
        connections = {
            c.broker: c
            for c in (
                await self.session.execute(
                    select(BrokerConnection).where(BrokerConnection.user_id == user_id)
                )
            ).scalars()
        }
        brokers = []
        for name, cls in ADAPTERS.items():
            conn = connections.get(name)
            own = self._own_credentials(conn)
            brokers.append(
                {
                    "broker": name,
                    "label": cls.label,
                    "platform_configured": cls.is_configured(),
                    "own_key": _mask(own.app_id) if own else None,
                    "needs_secret": cls.needs_secret,
                    # The URL users register in their own developer app.
                    "redirect_uri": redirect_uri(name),
                    "configured": cls.is_configured() or own is not None,
                    "connection": self.connection_view(conn) if conn else None,
                }
            )
        return {"brokers": brokers}

    def connection_view(self, conn: BrokerConnection) -> dict:
        status = conn.status
        if status == "active" and conn.token_expires_at and conn.token_expires_at <= datetime.now(timezone.utc):
            status = "expired"
        return {
            "id": str(conn.id),
            "broker": conn.broker,
            "status": status,
            "broker_user_id": conn.broker_user_id,
            "display_name": conn.display_name,
            "token_expires_at": conn.token_expires_at.isoformat() if conn.token_expires_at else None,
            "last_synced_at": conn.last_synced_at.isoformat() if conn.last_synced_at else None,
            "last_error": conn.last_error,
            "uses_own_key": bool(conn.app_id_enc),
            "live_data": ADAPTERS[conn.broker].supports_market_data,
            "daily_loss_limit": float(conn.daily_loss_limit) if conn.daily_loss_limit is not None else None,
        }

    async def set_daily_loss_limit(self, conn: BrokerConnection, limit: Optional[float]) -> dict:
        conn.daily_loss_limit = limit
        await self.audit.log_event(
            action="broker.daily_loss_limit_set",
            entity_type="broker_connection",
            entity_id=str(conn.id),
            actor_user_id=conn.user_id,
            metadata={"broker": conn.broker, "limit": limit},
        )
        await self.session.flush()
        return self.connection_view(conn)

    # -------------------------------------------------------------------- linking

    async def start_connect(self, user_id: uuid.UUID, broker: str) -> tuple[str, str]:
        if broker not in ADAPTERS:
            raise NotFoundException("Unknown broker")
        adapter = self.adapter(broker, await self._find(user_id, broker))
        try:
            adapter.credentials()
        except BrokerError as exc:
            raise BadRequestException(str(exc))
        state = secrets.token_urlsafe(24)
        redis = _redis()
        try:
            await redis.set(
                f"broker_state:{state}",
                json.dumps({"user_id": str(user_id), "broker": broker}),
                ex=STATE_TTL_SECONDS,
            )
        finally:
            await redis.aclose()
        return adapter.login_url(state, redirect_uri(broker)), state

    async def complete_connect(
        self, broker: str, params: dict, cookie_state: Optional[str]
    ) -> BrokerConnection:
        state = params.get("state") or cookie_state
        if not state or (cookie_state and params.get("state") and params["state"] != cookie_state):
            raise BadRequestException("This sign-in link doesn't match your session. Start again.")
        redis = _redis()
        try:
            raw = await redis.getdel(f"broker_state:{state}")
        finally:
            await redis.aclose()
        if not raw:
            raise BadRequestException("This sign-in link has expired. Start again.")
        pending = json.loads(raw)
        if pending["broker"] != broker:
            raise BadRequestException("This sign-in link was for a different broker.")
        user_id = uuid.UUID(pending["user_id"])

        conn = await self._find(user_id, broker)
        adapter = self.adapter(broker, conn)
        try:
            result = await adapter.complete_login(params, redirect_uri(broker))
            profile = await adapter.profile(result.tokens)
        finally:
            await adapter.aclose()

        if not conn:
            conn = BrokerConnection(user_id=user_id, broker=broker)
            self.session.add(conn)
        conn.status = "active"
        conn.last_error = None
        conn.broker_user_id = profile.broker_user_id or conn.broker_user_id
        conn.display_name = profile.name or conn.display_name
        conn.access_token_enc = crypto.encrypt(result.tokens.access_token)
        conn.refresh_token_enc = crypto.encrypt(result.tokens.refresh_token)
        conn.feed_token_enc = crypto.encrypt(result.tokens.feed_token)
        conn.token_expires_at = result.tokens.expires_at
        await self.session.flush()
        await self._portfolio(conn)

        await self.audit.log_event(
            action="broker.connected",
            entity_type="broker_connection",
            entity_id=str(conn.id),
            actor_user_id=user_id,
            metadata={"broker": broker, "broker_user_id": conn.broker_user_id},
        )
        return conn

    async def save_credentials(
        self, user_id: uuid.UUID, broker: str, app_id: str, app_secret: Optional[str]
    ) -> dict:
        """
        Store a user's own developer-app credentials (encrypted). A new key
        means existing tokens belong to the old app, so the link is reset to
        pending and the user signs in again.
        """
        cls = ADAPTERS.get(broker)
        if not cls:
            raise NotFoundException("Unknown broker")
        app_id = app_id.strip()
        app_secret = (app_secret or "").strip() or None
        if not _APP_ID_FORMAT[broker].match(app_id):
            example = "ABCD1234-100" if broker == "fyers" else "the API key from SmartAPI"
            raise BadRequestException(f"That doesn't look like a {cls.label} app ID (expected {example})")
        if cls.needs_secret and not (app_secret and _SECRET_FORMAT.match(app_secret)):
            raise BadRequestException(f"{cls.label} also needs the app's secret ID")

        conn = await self._find(user_id, broker)
        if not conn:
            conn = BrokerConnection(user_id=user_id, broker=broker)
            self.session.add(conn)
        conn.app_id_enc = crypto.encrypt(app_id)
        conn.app_secret_enc = crypto.encrypt(app_secret) if cls.needs_secret else None
        conn.access_token_enc = conn.refresh_token_enc = conn.feed_token_enc = None
        conn.token_expires_at = None
        conn.status = "pending"
        conn.last_error = None
        await self.session.flush()
        await self.audit.log_event(
            action="broker.credentials_saved",
            entity_type="broker_connection",
            entity_id=str(conn.id),
            actor_user_id=user_id,
            metadata={"broker": broker, "app_id": _mask(app_id)},
        )
        return self.connection_view(conn)

    async def remove_credentials(self, user_id: uuid.UUID, broker: str) -> None:
        """Forget the user's own key; the link made with it can't work without it."""
        conn = await self._find(user_id, broker)
        if not conn or not conn.app_id_enc:
            raise NotFoundException("No API key saved for this broker")
        await self.disconnect(conn)

    async def get_connection(self, connection_id: uuid.UUID, user_id: uuid.UUID) -> BrokerConnection:
        conn = await self.session.get(BrokerConnection, connection_id)
        if not conn or conn.user_id != user_id:
            raise NotFoundException("Broker connection not found")
        return conn

    async def disconnect(self, conn: BrokerConnection) -> None:
        """Delete the tokens. The journal stays; the stale mirror of holdings goes."""
        portfolio = await self._portfolio(conn, create=False)
        if portfolio:
            await self.session.execute(delete(Holding).where(Holding.portfolio_id == portfolio.id))
            portfolio.name = f"{portfolio.name} (disconnected)"
            portfolio.kind = "manual"
        await self.audit.log_event(
            action="broker.disconnected",
            entity_type="broker_connection",
            entity_id=str(conn.id),
            actor_user_id=conn.user_id,
            metadata={"broker": conn.broker},
        )
        await self.session.delete(conn)
        await self.session.flush()

    # ----------------------------------------------------------------------- data

    def _tokens(self, conn: BrokerConnection) -> TokenBundle:
        access = crypto.decrypt(conn.access_token_enc)
        if not access:
            raise BadRequestException(
                "Sign in to your broker first to link this account.",
                error_code="BROKER_SESSION_EXPIRED",
            )
        return TokenBundle(
            access_token=access,
            refresh_token=crypto.decrypt(conn.refresh_token_enc),
            feed_token=crypto.decrypt(conn.feed_token_enc),
            expires_at=conn.token_expires_at,
        )

    async def _guard(self, conn: BrokerConnection, call):
        """Run a broker call; record expiry or failure on the connection."""
        try:
            return await call
        except BrokerAuthExpired as exc:
            conn.status = "expired"
            conn.last_error = str(exc)
            await self.session.commit()
            raise BadRequestException(str(exc), error_code="BROKER_SESSION_EXPIRED")
        except BrokerError as exc:
            conn.last_error = str(exc)[:500]
            await self.session.commit()
            raise BadRequestException(str(exc), error_code="BROKER_ERROR")

    async def snapshot(self, conn: BrokerConnection) -> dict:
        """Live funds and positions, straight from the broker (not stored)."""
        adapter = self.adapter(conn.broker, conn)
        tokens = self._tokens(conn)
        try:
            funds = await self._guard(conn, adapter.funds(tokens))
            positions = await self._guard(conn, adapter.positions(tokens))
        finally:
            await adapter.aclose()
        return {
            "funds": asdict(funds),
            "positions": [asdict(p) for p in positions if p.net_quantity],
        }

    async def sync(self, conn: BrokerConnection) -> dict:
        adapter = self.adapter(conn.broker, conn)
        tokens = self._tokens(conn)
        try:
            holdings = await self._guard(conn, adapter.holdings(tokens))
            trades = await self._guard(conn, adapter.trades(tokens))
        finally:
            await adapter.aclose()

        portfolio = await self._portfolio(conn)
        source = conn.broker.upper()
        unmapped: set[str] = set()
        avg_cost: dict[uuid.UUID, float] = {}

        # Holdings: replace the mirror.
        await self.session.execute(delete(Holding).where(Holding.portfolio_id == portfolio.id))
        synced = 0
        for h in holdings:
            instrument = await self._instrument(h.symbol)
            if not instrument or h.quantity <= 0:
                if not instrument:
                    unmapped.add(h.symbol)
                continue
            avg_cost[instrument.id] = h.average_price
            self.session.add(
                Holding(
                    portfolio_id=portfolio.id,
                    instrument_id=instrument.id,
                    quantity=h.quantity,
                    average_price=h.average_price,
                    source=source,
                )
            )
            synced += 1
        await self.session.flush()

        # Trades: journal each fill once, oldest first.
        journaled = 0
        for t in sorted(trades, key=lambda t: t.filled_at):
            instrument = await self._instrument(t.symbol)
            if not instrument:
                unmapped.add(t.symbol)
                continue
            added = await record_fill(
                self.session,
                Fill(
                    portfolio_id=portfolio.id,
                    instrument_id=instrument.id,
                    external_ref=f"{conn.broker}:{t.trade_id}",
                    source=source,
                    side=t.side,
                    quantity=t.quantity,
                    price=t.price,
                    filled_at=t.filled_at,
                ),
                fallback_entry_price=avg_cost.get(instrument.id),
            )
            journaled += int(added)

        conn.status = "active"
        conn.last_error = None
        conn.last_synced_at = datetime.now(timezone.utc)
        await self.session.flush()
        logger.info(
            "broker_synced", broker=conn.broker, holdings=synced, journaled=journaled, unmapped=len(unmapped)
        )
        return {
            "holdings": synced,
            "trades_journaled": journaled,
            "unmapped_symbols": sorted(unmapped),
            "portfolio_id": str(portfolio.id),
            "connection": self.connection_view(conn),
        }

    # ------------------------------------------------------------------ internals

    async def _portfolio(self, conn: BrokerConnection, create: bool = True) -> Optional[Portfolio]:
        portfolio = await self.session.scalar(
            select(Portfolio).where(Portfolio.broker_connection_id == conn.id)
        )
        if portfolio or not create:
            return portfolio
        label = ADAPTERS[conn.broker].label
        portfolio = Portfolio(
            user_id=conn.user_id,
            name=f"{label} account",
            kind="broker",
            broker_connection_id=conn.id,
        )
        self.session.add(portfolio)
        await self.session.flush()
        return portfolio

    async def _instrument(self, broker_symbol: str) -> Optional[Instrument]:
        symbol = to_instrument_symbol(broker_symbol)
        if not symbol:
            return None
        instrument = await self.instruments.get_instrument_by_symbol(symbol)
        if instrument:
            return instrument
        from app.modules.instruments.master import ensure_instrument

        try:
            async with self.session.begin_nested():
                return await ensure_instrument(self.session, symbol)
        except Exception as exc:
            logger.warning("broker_symbol_unmapped", symbol=broker_symbol, error=str(exc))
            return None
