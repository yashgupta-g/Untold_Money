"""
Broker adapter interface. Each broker (Angel One, Fyers, …) implements this
so the rest of the app never deals with a broker's own formats.

Read-only for now: profile, funds, holdings, positions and today's trades,
plus market data (quotes and candles) for brokers that offer it. Order
placement arrives in Phase 3 behind risk checks and confirmation.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

import httpx

IST = ZoneInfo("Asia/Kolkata")


class BrokerError(Exception):
    """The broker refused or failed a request."""


class BrokerAuthExpired(BrokerError):
    """The access token is no longer valid; the user must reconnect."""


class BrokerNotConfigured(BrokerError):
    """This server has no API credentials for the broker."""


@dataclass(frozen=True)
class AppCredentials:
    """A broker developer app: the platform's, or a user's own (advanced)."""

    app_id: str  # Angel One API key / Fyers App ID
    app_secret: Optional[str] = None  # Fyers Secret ID (Angel One needs none)


@dataclass(frozen=True)
class TokenBundle:
    access_token: str
    refresh_token: Optional[str] = None
    feed_token: Optional[str] = None
    expires_at: Optional[datetime] = None


@dataclass(frozen=True)
class BrokerProfile:
    broker_user_id: str
    name: Optional[str] = None


@dataclass(frozen=True)
class BrokerFunds:
    available_cash: Optional[float]
    used_margin: Optional[float]
    net: Optional[float]


@dataclass(frozen=True)
class BrokerHolding:
    symbol: str  # broker's own symbol, e.g. "RELIANCE-EQ" or "NSE:RELIANCE-EQ"
    exchange: str
    quantity: float
    average_price: float
    last_price: Optional[float] = None
    pnl: Optional[float] = None
    isin: Optional[str] = None


@dataclass(frozen=True)
class BrokerPosition:
    symbol: str
    exchange: str
    product: str
    net_quantity: float
    average_price: float
    last_price: Optional[float] = None
    pnl: Optional[float] = None  # realised + unrealised, as the broker reports it
    realized_pnl: Optional[float] = None


@dataclass(frozen=True)
class BrokerQuote:
    symbol: str  # broker's symbol, e.g. "NSE:RELIANCE-EQ"
    price: float
    change: float
    change_percent: float
    open: Optional[float]
    high: Optional[float]
    low: Optional[float]
    previous_close: Optional[float]
    volume: int
    timestamp: datetime


@dataclass(frozen=True)
class BrokerCandle:
    time: datetime  # UTC
    open: float
    high: float
    low: float
    close: float
    volume: int


@dataclass(frozen=True)
class BrokerTrade:
    trade_id: str
    order_id: str
    symbol: str
    exchange: str
    side: str  # BUY | SELL
    quantity: float
    price: float
    filled_at: datetime
    product: Optional[str] = None


@dataclass
class CallbackResult:
    tokens: TokenBundle
    state: Optional[str] = None
    extras: dict = field(default_factory=dict)


def next_morning_ist(hour: int, minute: int = 0) -> datetime:
    """The next occurrence of hour:minute IST, as UTC (when daily tokens lapse)."""
    now = datetime.now(IST)
    target = datetime.combine(now.date(), time(hour, minute), tzinfo=IST)
    if target <= now:
        target += timedelta(days=1)
    return target.astimezone(timezone.utc)


def to_float(value) -> Optional[float]:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class BrokerAdapter(ABC):
    """
    One instance per request. `credentials` selects the developer app (a
    user's own, else the platform's from settings); `client` is injectable
    for tests.
    """

    name: str
    label: str
    needs_secret: bool = False
    # Quotes and candles through the user's own connection (shown only to
    # that user; never stored in shared tables or rebroadcast).
    supports_market_data: bool = False

    def __init__(
        self,
        client: Optional[httpx.AsyncClient] = None,
        credentials: Optional[AppCredentials] = None,
    ):
        self._client = client
        self._credentials = credentials

    @classmethod
    def is_configured(cls) -> bool:
        """Whether the platform itself has an app for this broker."""
        return cls.platform_credentials() is not None

    @staticmethod
    @abstractmethod
    def platform_credentials() -> Optional[AppCredentials]: ...

    def credentials(self) -> AppCredentials:
        creds = self._credentials or self.platform_credentials()
        if not creds:
            raise BrokerNotConfigured(f"{self.label} isn't set up yet. Add your own API key to connect.")
        return creds

    async def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=15)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()

    @abstractmethod
    def login_url(self, state: str, redirect_uri: str) -> str: ...

    @abstractmethod
    async def complete_login(self, params: dict, redirect_uri: str) -> CallbackResult: ...

    @abstractmethod
    async def profile(self, tokens: TokenBundle) -> BrokerProfile: ...

    @abstractmethod
    async def funds(self, tokens: TokenBundle) -> BrokerFunds: ...

    @abstractmethod
    async def holdings(self, tokens: TokenBundle) -> list[BrokerHolding]: ...

    @abstractmethod
    async def positions(self, tokens: TokenBundle) -> list[BrokerPosition]: ...

    @abstractmethod
    async def trades(self, tokens: TokenBundle) -> list[BrokerTrade]: ...

    # Market data. Only adapters with supports_market_data implement these.

    def market_symbol(
        self, symbol: str, exchange: str = "NSE", instrument_type: str = "EQUITY"
    ) -> Optional[str]:
        """This broker's name for an UntoldMoney instrument symbol."""
        raise NotImplementedError

    async def quotes(self, tokens: TokenBundle, symbols: list[str]) -> list[BrokerQuote]:
        raise NotImplementedError

    async def history(
        self, tokens: TokenBundle, symbol: str, interval: str, start: datetime, end: datetime
    ) -> list[BrokerCandle]:
        """Candles for an UntoldMoney interval ("1m" … "1d"), oldest first."""
        raise NotImplementedError
