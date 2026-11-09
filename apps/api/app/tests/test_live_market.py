"""
Market data through the user's own broker (Fyers): symbol and interval
mapping, quote/history parsing, the broker as the only source for quotes,
candles, analysis and paper fills, the NSE instrument master, the live stream hub, the
WebSocket endpoint, and optional auth rejecting ended sessions.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.config import get_settings
from app.core.dependencies import get_optional_user_id, resolve_access_token
from app.core.exceptions import BrokerRequiredException, UnauthorizedException
from app.main import app
from app.modules.brokers import crypto
from app.modules.brokers.adapters.base import (
    BrokerAuthExpired,
    BrokerCandle,
    BrokerPosition,
    BrokerQuote,
    TokenBundle,
)
from app.modules.brokers.adapters.fyers import FyersAdapter
from app.modules.brokers.market import lookback, to_weekly
from app.modules.brokers.models import BrokerConnection
from app.modules.brokers.symbols import from_fyers_symbol, to_fyers_symbol
from app.modules.instruments.master import ensure_instrument, parse_master, sync_instruments
from app.modules.instruments.models import Exchange, Instrument
from app.modules.market_data.service import MarketDataService
from app.modules.paper.schemas import PaperAccountCreate, PaperOrderCreate
from app.modules.paper.service import PaperService
from app.modules.stream import router as stream_router
from app.modules.stream.hub import SourceSettings, StreamHub, day_pnl
from app.modules.users.models import User

TOKENS = TokenBundle(access_token="tok-123")
NOW = datetime(2026, 11, 9, 7, 0, tzinfo=timezone.utc)


@pytest.fixture
def fyers_keys():
    s = get_settings()
    saved = (s.FYERS_APP_ID, s.FYERS_SECRET_ID)
    s.FYERS_APP_ID, s.FYERS_SECRET_ID = "APP123-100", "secret"
    yield s
    s.FYERS_APP_ID, s.FYERS_SECRET_ID = saved


# ------------------------------------------------------------- pure mapping


@pytest.mark.parametrize(
    "ours, exchange, theirs",
    [
        ("RELIANCE", "NSE", "NSE:RELIANCE-EQ"),
        ("m&m", "NSE", "NSE:M&M-EQ"),
        ("TCS", "BSE", "BSE:TCS-EQ"),
        ("BANKNIFTY", "NSE", "NSE:NIFTYBANK-INDEX"),
        ("BAD SYMBOL", "NSE", None),
        ("TCS", "MCX", None),
    ],
)
def test_to_fyers_symbol(ours, exchange, theirs):
    assert to_fyers_symbol(ours, exchange) == theirs


def test_from_fyers_symbol():
    assert from_fyers_symbol("NSE:RELIANCE-EQ") == "RELIANCE"
    assert from_fyers_symbol("NSE:NIFTYBANK-INDEX") == "BANKNIFTY"


def test_lookback_covers_enough_trading_days():
    # 200 five-minute candles is about 2.7 sessions: a few calendar days.
    assert timedelta(days=4) <= lookback("5m", 200) <= timedelta(days=12)
    assert lookback("1d", 200) >= timedelta(days=280)


def test_weekly_from_daily():
    days = [
        BrokerCandle(datetime(2026, 11, d, 4, tzinfo=timezone.utc), o, h, l, c, v)
        for d, o, h, l, c, v in [
            (2, 10, 12, 9, 11, 100),  # Mon
            (6, 11, 15, 10, 14, 200),  # Fri
            (9, 14, 16, 13, 15, 50),  # next Mon
        ]
    ]
    weeks = to_weekly(days)
    assert [(w.open, w.high, w.low, w.close, w.volume) for w in weeks] == [
        (10, 15, 9, 14, 300),
        (14, 16, 13, 15, 50),
    ]


def test_day_pnl_marks_open_positions_at_live_price():
    positions = [
        BrokerPosition("NSE:TCS-EQ", "NSE", "INTRADAY", 10, 100.0, last_price=101.0, pnl=10.0, realized_pnl=0.0),
        BrokerPosition("NSE:INFY-EQ", "NSE", "INTRADAY", 0, 0.0, pnl=-50.0, realized_pnl=-50.0),
    ]
    assert day_pnl(positions, {}) == -40.0  # 10 × (101 − 100) − 50
    assert day_pnl(positions, {"NSE:TCS-EQ": 95.0}) == -100.0  # 10 × (95 − 100) − 50


# ---------------------------------------------------------- Fyers parsing


def quote_row(symbol: str, lp: float = 1307.8) -> dict:
    return {
        "n": symbol,
        "s": "ok",
        "v": {
            "lp": lp, "ch": -16.2, "chp": -1.22, "open_price": 1317, "high_price": 1324.8,
            "low_price": 1305.5, "prev_close_price": 1324, "volume": 10003650, "tt": "1794182400",
        },
    }


def data_transport(calls: list, prices: dict | None = None):
    prices = prices or {}

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.headers.get("authorization") == "APP123-100:expired":
            return httpx.Response(200, json={"s": "error", "code": -16, "message": "token expired"})
        if request.url.path == "/data/quotes":
            symbols = request.url.params["symbols"].split(",")
            rows = [
                quote_row(s, prices.get(s, 1307.8)) if s != "NSE:UNKNOWN-EQ" else {"n": s, "s": "error", "v": {}}
                for s in symbols
            ]
            return httpx.Response(200, json={"s": "ok", "code": 200, "d": rows})
        if request.url.path == "/data/history":
            start = int(request.url.params["range_from"])
            if request.url.params["resolution"] == "D" and start < 0:
                return httpx.Response(200, json={"s": "no_data", "candles": []})
            return httpx.Response(
                200,
                json={"s": "ok", "candles": [[start, 1, 2, 0.5, 1.5, 10], [start + 300, 1.5, 2.5, 1, 2, 20]]},
            )
        if request.url.path == "/api/v3/positions":
            return httpx.Response(200, json={"s": "ok", "netPositions": []})
        if request.url.path == "/api/v3/profile":
            return httpx.Response(200, json={"s": "ok", "data": {"fy_id": "XY1"}})
        return httpx.Response(404, json={"s": "error", "message": "not mocked"})

    return httpx.MockTransport(handler)


async def test_fyers_quotes_chunk_and_skip_unknown(fyers_keys):
    calls: list = []
    adapter = FyersAdapter(client=httpx.AsyncClient(transport=data_transport(calls)))
    symbols = [f"NSE:S{i}-EQ" for i in range(60)] + ["NSE:UNKNOWN-EQ"]
    quotes = await adapter.quotes(TOKENS, symbols)
    assert len(calls) == 2  # 50 per request
    assert len(quotes) == 60
    q = quotes[0]
    assert (q.price, q.change_percent, q.previous_close, q.volume) == (1307.8, -1.22, 1324, 10003650)
    assert calls[0].url.host == "api-t1.fyers.in" and calls[0].url.path == "/data/quotes"
    assert calls[0].headers["authorization"] == "APP123-100:tok-123"


async def test_fyers_history_splits_long_ranges(fyers_keys):
    calls: list = []
    adapter = FyersAdapter(client=httpx.AsyncClient(transport=data_transport(calls)))
    end = NOW
    candles = await adapter.history(TOKENS, "NSE:TCS-EQ", "5m", end - timedelta(days=150), end)
    assert len(calls) == 2  # intraday requests cover at most ~100 days
    assert all(c.url.params["resolution"] == "5" for c in calls)
    assert candles == sorted(candles, key=lambda c: c.time)
    with pytest.raises(Exception):
        await adapter.history(TOKENS, "NSE:TCS-EQ", "1w", end - timedelta(days=10), end)


# ------------------------------------------------- broker is the only source


@pytest.fixture
async def connected(db_session, fyers_keys, monkeypatch):
    """A user with an active Fyers connection and two NSE instruments."""
    user = User(full_name="Live Trader", email=f"live-{uuid.uuid4().hex[:6]}@example.com", password_hash="x")
    exchange = Exchange(code="NSE", name="National Stock Exchange", country="IN")
    db_session.add_all([user, exchange])
    await db_session.flush()
    for symbol in ("RELIANCE", "TCS"):
        db_session.add(Instrument(exchange_id=exchange.id, symbol=symbol, name=symbol, instrument_type="EQUITY"))
    conn = BrokerConnection(
        user_id=user.id,
        broker="fyers",
        status="active",
        access_token_enc=crypto.encrypt("tok-123"),
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=6),
    )
    db_session.add(conn)
    await db_session.commit()

    calls: list = []
    monkeypatch.setattr(
        "app.modules.brokers.service.get_adapter",
        lambda broker, credentials=None: FyersAdapter(
            client=httpx.AsyncClient(transport=data_transport(calls, {"NSE:RELIANCE-EQ": 1234.5})),
            credentials=credentials,
        ),
    )
    return user, conn, calls


async def test_quote_comes_from_the_users_broker(db_session, connected):
    user, _, _ = connected
    quote = await MarketDataService(db_session).get_quote("RELIANCE", user.id)
    assert (quote.provider, quote.price) == ("fyers", 1234.5)


async def test_no_connection_means_no_market_data(db_session, connected):
    with pytest.raises(BrokerRequiredException) as anon:
        await MarketDataService(db_session).get_quote("RELIANCE", None)
    assert anon.value.status_code == 428 and anon.value.error_code == "BROKER_REQUIRED"
    stranger = uuid.uuid4()
    with pytest.raises(BrokerRequiredException):
        await MarketDataService(db_session).get_candles("RELIANCE", stranger)


async def test_expired_broker_token_asks_to_reconnect(db_session, connected):
    user, conn, _ = connected
    conn.access_token_enc = crypto.encrypt("expired")
    await db_session.commit()
    with pytest.raises(BrokerRequiredException) as ended:
        await MarketDataService(db_session).get_quote("TCS", user.id)
    assert ended.value.error_code == "BROKER_SESSION_EXPIRED"
    await db_session.refresh(conn)
    assert conn.status == "expired"


async def test_batch_quotes_use_one_broker_call(db_session, connected):
    user, _, calls = connected
    quotes = await MarketDataService(db_session).get_quotes(["reliance", "TCS", "NOPE"], user.id)
    assert set(quotes) == {"RELIANCE", "TCS"} and quotes["RELIANCE"].price == 1234.5
    assert len([c for c in calls if c.url.path == "/data/quotes"]) == 1


async def test_intraday_candles_from_broker(db_session, connected):
    user, _, calls = connected
    candles = await MarketDataService(db_session).get_candles("TCS", user.id, interval="5m", limit=3)
    assert candles and all(c.provider == "fyers" and c.interval == "5m" for c in candles)
    assert len(candles) <= 3
    history = [c for c in calls if c.url.path == "/data/history"]
    assert history and history[0].url.params["symbol"] == "NSE:TCS-EQ"


async def test_paper_market_order_fills_at_broker_price(db_session, connected):
    user, _, _ = connected
    service = PaperService(db_session, user_id=user.id)
    view = await service.create_account(user.id, PaperAccountCreate(name="Live", starting_cash=100_000))
    account = await service.get_account(view.id, user.id)
    order = await service.place_order(account, PaperOrderCreate(symbol="RELIANCE", side="BUY", quantity=2))
    assert (order.status, order.fill_price) == ("FILLED", 1234.5)


async def test_paper_order_needs_a_connection(db_session, connected):
    user, conn, _ = connected
    await db_session.delete(conn)
    await db_session.commit()
    service = PaperService(db_session, user_id=user.id)
    view = await service.create_account(user.id, PaperAccountCreate(name="Off", starting_cash=100_000))
    account = await service.get_account(view.id, user.id)
    with pytest.raises(BrokerRequiredException):
        await service.place_order(account, PaperOrderCreate(symbol="RELIANCE", side="BUY", quantity=1))


async def test_market_endpoints_answer_428_without_a_broker(db_client):
    for path in ("/api/v1/market-data/RELIANCE/quote", "/api/v1/analytics/RELIANCE/indicators"):
        response = await db_client.get(path)
        assert response.status_code == 428
        assert response.json()["error_code"] == "BROKER_REQUIRED"


# --------------------------------------------------------- instrument master

MASTER_CSV = """10100000002885,RELIANCE INDUSTRIES LTD,0,1,0.1,INE002A01018,0915-1530|1815-1915:,2026-11-08,,NSE:RELIANCE-EQ,10,10,2885,RELIANCE,2885
101000000016669,BAJAJ AUTO LIMITED,0,1,0.5,INE917I01010,0915-1530|1815-1915:,2026-11-08,,NSE:BAJAJ-AUTO-EQ,10,10,16669,BAJAJ-AUTO,16669
10100000007750,21ST CENTURY MGMT SERVICE,0,1,0.01,INE253B01015,0915-1530|1815-1915:,2026-11-08,,NSE:21STCENMGM-BE,10,10,7750,21STCENMGM,7750
101000000026000,NIFTY50-INDEX,10,0,0.05,,0915-1530|1815-1915:,2026-11-08,,NSE:NIFTY50-INDEX,10,10,26000,NIFTY,26000
"""


def test_master_keeps_equities_and_indices():
    rows = parse_master(MASTER_CSV)
    assert set(rows) == {"RELIANCE", "BAJAJ-AUTO", "NIFTY50"}
    assert rows["RELIANCE"].isin == "INE002A01018"
    assert rows["NIFTY50"].instrument_type == "INDEX"
    assert to_fyers_symbol("BAJAJ-AUTO") == "NSE:BAJAJ-AUTO-EQ"
    assert to_fyers_symbol("NIFTYIT", "NSE", "INDEX") == "NSE:NIFTYIT-INDEX"


async def test_sync_and_ensure_instruments(db_session, monkeypatch):
    rows = parse_master(MASTER_CSV)

    async def fake_load(force=False):
        return rows

    monkeypatch.setattr("app.modules.instruments.master.load_master", fake_load)
    assert await sync_instruments(db_session, rows) == 3
    assert await sync_instruments(db_session, rows) == 0  # idempotent
    assert (await ensure_instrument(db_session, "bajaj-auto")).name == "BAJAJ AUTO LIMITED"
    assert await ensure_instrument(db_session, "NOTLISTED") is None


async def test_optional_auth_ignores_ended_sessions(db_client, db_session):
    reg = await db_client.post(
        "/api/v1/auth/register",
        json={"full_name": "Opt User", "email": "opt@example.com", "password": "Str0ngPassw0rd",
              "accept_terms": True, "accept_privacy": True},
    )
    token = reg.json()["data"]["tokens"]["access_token"]
    user_id, _ = await resolve_access_token(db_session, token)
    assert await get_optional_user_id(db_session, f"Bearer {token}") == user_id

    await db_client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    with pytest.raises(UnauthorizedException):
        await resolve_access_token(db_session, token)
    assert await get_optional_user_id(db_session, f"Bearer {token}") is None
    assert await get_optional_user_id(db_session, "Bearer not-a-jwt") is None


# ------------------------------------------------------------- stream hub


class FakeSource:
    provider = "fyers"

    def __init__(self, prices: dict[str, float], positions=None, limit=None):
        self.prices = prices
        self._positions = positions or []
        self.limit = limit
        self.closed = False
        self.expired = False
        self.breaches: list = []

    def market_symbol(self, symbol):
        return to_fyers_symbol(symbol)

    async def quotes(self, symbols):
        if self.expired:
            raise BrokerAuthExpired("ended")
        return [
            BrokerQuote(s, p, 0.0, 0.0, p, p, p, p, 100, NOW) for s, p in self.prices.items() if s in symbols
        ]

    async def positions(self):
        return self._positions

    async def settings(self):
        return SourceSettings(daily_loss_limit=self.limit)

    async def record_breach(self, pnl, limit):
        self.breaches.append((pnl, limit))

    async def aclose(self):
        self.closed = True


async def _drain(client, seconds=0.15) -> list[dict]:
    await asyncio.sleep(seconds)
    out = []
    while not client.queue.empty():
        out.append(client.queue.get_nowait())
    return out


async def test_hub_sends_ticks_only_to_their_owner():
    a, b = uuid.uuid4(), uuid.uuid4()
    sources = {
        a: FakeSource({"NSE:RELIANCE-EQ": 1300.0}),
        b: FakeSource({"NSE:RELIANCE-EQ": 1400.0, "NSE:TCS-EQ": 2400.0}),
    }

    async def factory(user_id):
        return sources[user_id]

    hub = StreamHub(factory, poll_seconds=0.02, idle_grace=0)
    ca, cb = await hub.attach(a), await hub.attach(b)
    hub.subscribe(ca, ["RELIANCE"])
    hub.subscribe(cb, ["TCS"])
    got_a, got_b = await _drain(ca), await _drain(cb)

    assert {"type": "status", "live": True, "state": "live", "provider": "fyers"} in got_a
    ticks_a = [m for m in got_a if m["type"] == "tick"]
    ticks_b = [m for m in got_b if m["type"] == "tick"]
    assert ticks_a and all((m["symbol"], m["ltp"]) == ("RELIANCE", 1300.0) for m in ticks_a)
    assert ticks_b and all(m["symbol"] == "TCS" for m in ticks_b)  # b never sees its RELIANCE

    # A second tab gets the last price straight away.
    ca2 = await hub.attach(a)
    hub.subscribe(ca2, ["RELIANCE"])
    assert any(m["type"] == "tick" for m in await _drain(ca2, 0))

    for c in (ca, ca2, cb):
        await hub.detach(c)
    await asyncio.sleep(0.05)
    assert not hub.streams and sources[a].closed and sources[b].closed


async def test_hub_without_connection_reports_not_live():
    async def factory(_):
        return None

    hub = StreamHub(factory, poll_seconds=0.02, idle_grace=0)
    client = await hub.attach(uuid.uuid4())
    statuses = [m for m in await _drain(client) if m["type"] == "status"]
    assert statuses[-1]["live"] is False and statuses[-1]["state"] == "no_connection"
    await hub.shutdown()


async def test_hub_reports_expiry():
    source = FakeSource({"NSE:TCS-EQ": 1.0})
    source.expired = True

    async def factory(_):
        return source

    hub = StreamHub(factory, poll_seconds=0.02, idle_grace=0)
    client = await hub.attach(uuid.uuid4())
    hub.subscribe(client, ["TCS"])
    statuses = [m for m in await _drain(client) if m["type"] == "status"]
    assert statuses[-1]["state"] == "expired"
    await hub.shutdown()


async def test_daily_loss_alert_fires_once():
    position = BrokerPosition("NSE:TCS-EQ", "NSE", "INTRADAY", 10, 100.0, last_price=100.0, realized_pnl=0.0)
    source = FakeSource({"NSE:TCS-EQ": 100.0}, positions=[position], limit=500.0)

    async def factory(_):
        return source

    hub = StreamHub(factory, poll_seconds=0.02, idle_grace=0)
    client = await hub.attach(uuid.uuid4())
    await _drain(client, 0.06)
    source.prices["NSE:TCS-EQ"] = 40.0  # 10 × (40 − 100) = −600, past the −500 limit
    messages = await _drain(client, 0.15)
    risk = [m for m in messages if m["type"] == "risk"]
    assert len(risk) == 1 and risk[0]["day_pnl"] == -600.0
    assert [m for m in messages if m["type"] == "pnl"][-1]["breached"] is True
    assert source.breaches == [(-600.0, 500.0)]
    await hub.shutdown()


# ------------------------------------------------------------- websocket


@contextlib.asynccontextmanager
async def _no_session():
    yield None


@pytest.fixture
def ws_app(monkeypatch):
    user_id = uuid.uuid4()
    source = FakeSource({"NSE:RELIANCE-EQ": 1300.0})

    async def factory(_):
        return source

    hub = StreamHub(factory, poll_seconds=0.02, idle_grace=0)

    async def fake_resolve(_session, token):
        if token != "good":
            raise UnauthorizedException("no")
        return user_id, uuid.uuid4()

    monkeypatch.setattr(stream_router, "resolve_access_token", fake_resolve)
    app.dependency_overrides[stream_router.get_hub] = lambda: hub
    app.dependency_overrides[stream_router.get_stream_session_factory] = lambda: _no_session
    yield TestClient(app)
    app.dependency_overrides.pop(stream_router.get_hub, None)
    app.dependency_overrides.pop(stream_router.get_stream_session_factory, None)


def test_websocket_requires_auth(ws_app):
    with ws_app.websocket_connect("/api/v1/stream") as ws:
        ws.send_json({"type": "auth", "token": "bad"})
        assert ws.receive_json()["code"] == "unauthorized"
        with pytest.raises(WebSocketDisconnect) as closed:
            ws.receive_json()
        assert closed.value.code == 4401


def test_websocket_rejects_foreign_origin(ws_app):
    with pytest.raises(WebSocketDisconnect):
        with ws_app.websocket_connect("/api/v1/stream", headers={"origin": "https://evil.example"}) as ws:
            ws.receive_json()


def test_websocket_streams_ticks(ws_app):
    origin = get_settings().BACKEND_CORS_ORIGINS[0]
    with ws_app.websocket_connect("/api/v1/stream", headers={"origin": origin}) as ws:
        ws.send_json({"type": "auth", "token": "good"})
        ws.send_json({"type": "subscribe", "symbols": ["reliance", "not a symbol!"]})
        ws.send_json({"type": "ping"})
        # status (connecting), status (live), one tick (the price never moves), pong
        seen: list[dict] = []
        while not {"tick", "pong"} <= {m["type"] for m in seen} and len(seen) < 6:
            seen.append(ws.receive_json())
        assert {"status", "tick", "pong"} <= {m["type"] for m in seen}
        tick = next(m for m in seen if m["type"] == "tick")
        assert (tick["symbol"], tick["ltp"]) == ("RELIANCE", 1300.0)


async def test_rate_limiter_lets_websockets_through():
    from app.core.rate_limit import RateLimitMiddleware

    seen = []

    async def inner(scope, receive, send):
        seen.append(scope["type"])

    settings = get_settings()
    settings.RATE_LIMIT_ENABLED = True
    try:
        await RateLimitMiddleware(inner)({"type": "websocket", "path": "/api/v1/stream"}, None, None)
    finally:
        settings.RATE_LIMIT_ENABLED = False
    assert seen == ["websocket"]
