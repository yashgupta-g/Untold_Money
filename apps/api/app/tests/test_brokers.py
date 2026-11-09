"""
Broker connections: symbol mapping, token encryption, the Fyers and Angel One
adapters against documented response shapes (mocked HTTP), and the full
connect → callback → sync → disconnect flow through the API.
"""

from __future__ import annotations

import hashlib
import json
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.config import get_settings
from app.modules.brokers import crypto
from app.modules.brokers.adapters.angelone import AngelOneAdapter
from app.modules.brokers.adapters.base import BrokerAuthExpired, TokenBundle
from app.modules.brokers.adapters.fyers import FyersAdapter, parse_fyers_time
from app.modules.brokers.models import BrokerConnection
from app.modules.brokers.symbols import to_instrument_symbol
from app.modules.instruments.models import Exchange, Instrument
from app.modules.portfolio.models import Holding, Portfolio
from app.modules.trades.models import Trade

TOKENS = TokenBundle(access_token="tok-123")


@pytest.fixture
def broker_settings():
    s = get_settings()
    saved = (s.FYERS_APP_ID, s.FYERS_SECRET_ID, s.ANGELONE_API_KEY)
    s.FYERS_APP_ID, s.FYERS_SECRET_ID, s.ANGELONE_API_KEY = "APP123-100", "secret", "angel-key"
    yield s
    s.FYERS_APP_ID, s.FYERS_SECRET_ID, s.ANGELONE_API_KEY = saved


# --------------------------------------------------------------------- symbols


@pytest.mark.parametrize(
    "broker_symbol, expected",
    [
        ("RELIANCE-EQ", "RELIANCE"),
        ("NSE:RELIANCE-EQ", "RELIANCE"),
        ("NSE:M&M-EQ", "M&M"),
        ("TCS", "TCS"),
        ("RELIANCE", "RELIANCE"),  # ends in "CE" but is not an option
        ("NSE:NIFTY24NOVFUT", None),
        ("BANKNIFTY24N2848000CE", None),
        ("NSE:RELIANCE24DEC3000PE", None),
    ],
)
def test_symbol_mapping(broker_symbol, expected):
    assert to_instrument_symbol(broker_symbol) == expected


def test_token_encryption_round_trip():
    sealed = crypto.encrypt("access-token")
    assert sealed and "access-token" not in sealed
    assert crypto.decrypt(sealed) == "access-token"
    assert crypto.decrypt("not-a-fernet-token") is None


def test_fyers_time_formats():
    assert parse_fyers_time("07-Aug-2020 13:51:12").hour == 13
    assert parse_fyers_time("07-08-2020 13:51:12").month == 8


# ----------------------------------------------------------------------- fyers

FYERS_RESPONSES = {
    "/api/v3/profile": {"s": "ok", "code": 200, "data": {"fy_id": "XY12345", "name": "Test Trader"}},
    "/api/v3/funds": {
        "s": "ok",
        "code": 200,
        "fund_limit": [
            {"id": 1, "title": "Total Balance", "equityAmount": 150000.5, "commodityAmount": 0},
            {"id": 2, "title": "Utilized Amount", "equityAmount": 20000, "commodityAmount": 0},
            {"id": 10, "title": "Available Balance", "equityAmount": 130000.5, "commodityAmount": 0},
        ],
    },
    "/api/v3/holdings": {
        "s": "ok",
        "code": 200,
        "holdings": [
            {"symbol": "NSE:RELIANCE-EQ", "quantity": 10, "costPrice": 2400.0, "ltp": 2500.0, "pl": 1000.0, "isin": "INE002A01018"},
            {"symbol": "NSE:NIFTY24NOVFUT", "quantity": 50, "costPrice": 24000, "ltp": 24100, "pl": 5000},
        ],
        "overall": {},
    },
    "/api/v3/positions": {
        "s": "ok",
        "code": 200,
        "netPositions": [
            {"symbol": "NSE:TCS-EQ", "netQty": 2, "netAvg": 4000, "ltp": 4050, "pl": 100, "productType": "INTRADAY"}
        ],
    },
    "/api/v3/tradebook": {
        "s": "ok",
        "code": 200,
        "tradeBook": [
            {"tradeNumber": "T1", "orderNumber": "O1", "symbol": "NSE:TCS-EQ", "side": 1, "tradedQty": 2,
             "tradePrice": 4000, "orderDateTime": "07-Nov-2026 10:15:00", "productType": "INTRADAY"},
            {"tradeNumber": "T2", "orderNumber": "O2", "symbol": "NSE:RELIANCE-EQ", "side": -1, "tradedQty": 4,
             "tradePrice": 2510, "orderDateTime": "07-11-2026 11:00:00", "productType": "CNC"},
        ],
    },
}


def fyers_transport(calls: list):
    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.url.path == "/api/v3/validate-authcode":
            return httpx.Response(200, json={"s": "ok", "code": 200, "access_token": "fy-access", "refresh_token": "fy-refresh"})
        if request.headers.get("authorization") == "APP123-100:expired":
            return httpx.Response(200, json={"s": "error", "code": -16, "message": "token expired"})
        return httpx.Response(200, json=FYERS_RESPONSES[request.url.path])

    return httpx.MockTransport(handler)


async def test_fyers_login_url_and_code_exchange(broker_settings):
    calls: list = []
    adapter = FyersAdapter(client=httpx.AsyncClient(transport=fyers_transport(calls)))
    query = parse_qs(urlparse(adapter.login_url("st4te", "http://cb")).query)
    assert query == {"client_id": ["APP123-100"], "redirect_uri": ["http://cb"], "response_type": ["code"], "state": ["st4te"]}

    result = await adapter.complete_login({"auth_code": "abc", "state": "st4te"}, "http://cb")
    assert result.tokens.access_token == "fy-access"
    body = json.loads(calls[0].content)
    assert body == {
        "grant_type": "authorization_code",
        "appIdHash": hashlib.sha256(b"APP123-100:secret").hexdigest(),
        "code": "abc",
    }


async def test_fyers_parsing(broker_settings):
    calls: list = []
    adapter = FyersAdapter(client=httpx.AsyncClient(transport=fyers_transport(calls)))
    funds = await adapter.funds(TOKENS)
    assert (funds.available_cash, funds.used_margin, funds.net) == (130000.5, 20000, 150000.5)
    holdings = await adapter.holdings(TOKENS)
    assert holdings[0].average_price == 2400.0
    trades = await adapter.trades(TOKENS)
    assert [(t.side, t.quantity) for t in trades] == [("BUY", 2), ("SELL", 4)]
    assert calls[0].headers["authorization"] == "APP123-100:tok-123"


async def test_fyers_expired_token(broker_settings):
    adapter = FyersAdapter(client=httpx.AsyncClient(transport=fyers_transport([])))
    with pytest.raises(BrokerAuthExpired):
        await adapter.holdings(TokenBundle(access_token="expired"))


# -------------------------------------------------------------------- angel one


def angel_transport(calls: list):
    data = {
        "/user/v1/getProfile": {"clientcode": "A1234", "name": "Test Trader"},
        "/user/v1/getRMS": {"net": "50000.00", "availablecash": "45000.00", "utiliseddebits": "5000.00"},
        "/portfolio/v1/getHolding": [
            {"tradingsymbol": "INFY-EQ", "exchange": "NSE", "quantity": 5, "averageprice": 1500.0, "ltp": 1550.0, "profitandloss": 250.0}
        ],
        "/order/v1/getPosition": [],
        "/order/v1/getTradeBook": [
            {"tradingsymbol": "INFY-EQ", "exchange": "NSE", "transactiontype": "BUY", "fillsize": "5",
             "fillprice": "1500.00", "orderid": "AO1", "fillid": "F1", "filltime": "09:45:10", "producttype": "DELIVERY"}
        ],
    }

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.headers.get("authorization") == "Bearer expired":
            return httpx.Response(200, json={"status": False, "message": "Invalid Token", "errorcode": "AG8001", "data": None})
        path = request.url.path.removeprefix("/rest/secure/angelbroking")
        return httpx.Response(200, json={"status": True, "message": "SUCCESS", "errorcode": "", "data": data[path]})

    return httpx.MockTransport(handler)


async def test_angel_headers_parsing_and_callback(broker_settings):
    calls: list = []
    adapter = AngelOneAdapter(client=httpx.AsyncClient(transport=angel_transport(calls)))
    assert "api_key=angel-key" in adapter.login_url("s", "http://cb")

    result = await adapter.complete_login(
        {"auth_token": "Bearer jwt-1", "feed_token": "feed", "refresh_token": "ref", "state": "s"}, "http://cb"
    )
    assert (result.tokens.access_token, result.tokens.feed_token) == ("jwt-1", "feed")

    funds = await adapter.funds(TOKENS)
    assert funds.available_cash == 45000.0
    [holding] = await adapter.holdings(TOKENS)
    assert (holding.symbol, holding.quantity) == ("INFY-EQ", 5)
    [trade] = await adapter.trades(TOKENS)
    assert (trade.side, trade.price, trade.filled_at.hour) == ("BUY", 1500.0, 9)

    headers = calls[0].headers
    assert headers["x-privatekey"] == "angel-key"
    assert headers["authorization"] == "Bearer tok-123"
    assert headers["x-usertype"] == "USER" and headers["x-sourceid"] == "WEB"


async def test_angel_expired_token(broker_settings):
    adapter = AngelOneAdapter(client=httpx.AsyncClient(transport=angel_transport([])))
    with pytest.raises(BrokerAuthExpired):
        await adapter.holdings(TokenBundle(access_token="expired"))


# ------------------------------------------------------------------ full flow


async def _user(db_client: AsyncClient, email: str) -> dict[str, str]:
    reg = await db_client.post(
        "/api/v1/auth/register",
        json={"full_name": "Broker User", "email": email, "password": "Str0ngPassw0rd",
              "accept_terms": True, "accept_privacy": True},
    )
    return {"Authorization": f"Bearer {reg.json()['data']['tokens']['access_token']}"}


@pytest.fixture
async def instruments(db_session):
    exchange = Exchange(code="NSE", name="National Stock Exchange", country="IN")
    db_session.add(exchange)
    await db_session.flush()
    for symbol in ("RELIANCE", "TCS"):
        db_session.add(Instrument(exchange_id=exchange.id, symbol=symbol, name=symbol, instrument_type="EQUITY"))
    await db_session.commit()


async def test_connect_callback_sync_disconnect(db_client, db_session, instruments, broker_settings, monkeypatch):
    monkeypatch.setattr(
        "app.modules.brokers.service.get_adapter",
        lambda broker, credentials=None: FyersAdapter(
            client=httpx.AsyncClient(transport=fyers_transport([])), credentials=credentials
        ),
    )
    headers = await _user(db_client, "flow@example.com")

    overview = (await db_client.get("/api/v1/brokers", headers=headers)).json()["data"]["brokers"]
    assert {b["broker"]: b["configured"] for b in overview} == {"angelone": True, "fyers": True}

    started = await db_client.post("/api/v1/brokers/fyers/connect", headers=headers)
    assert started.status_code == 200
    login_url = started.json()["data"]["login_url"]
    state = parse_qs(urlparse(login_url).query)["state"][0]
    assert db_client.cookies.get("um_broker_state") == state

    # Fyers sends the browser back with the code and our state.
    back = await db_client.get(f"/api/v1/brokers/fyers/callback?auth_code=abc&state={state}")
    assert back.status_code == 303
    assert back.headers["location"].endswith("/brokers?connected=fyers")

    conn = await db_session.scalar(select(BrokerConnection))
    assert conn.broker_user_id == "XY12345"
    assert conn.access_token_enc and "fy-access" not in conn.access_token_enc

    # The callback ran the first sync: RELIANCE mirrored, the future skipped.
    portfolio = await db_session.scalar(select(Portfolio).where(Portfolio.broker_connection_id == conn.id))
    assert portfolio.kind == "broker"
    holdings = (await db_session.execute(select(Holding).where(Holding.portfolio_id == portfolio.id))).scalars().all()
    assert [(float(h.quantity), float(h.average_price), h.source) for h in holdings] == [(10.0, 2400.0, "FYERS")]

    # Journal: the TCS buy is open; the RELIANCE sell closed against avg cost.
    trades = (await db_session.execute(select(Trade).where(Trade.portfolio_id == portfolio.id))).scalars().all()
    by_status = sorted((t.trade_status, float(t.entry_price), t.exit_price and float(t.exit_price)) for t in trades)
    assert by_status == [("CLOSED", 2400.0, 2510.0), ("OPEN", 4000.0, None)]

    # Syncing again adds nothing new.
    again = await db_client.post(f"/api/v1/brokers/connections/{conn.id}/sync", headers=headers)
    assert again.status_code == 200
    data = again.json()["data"]
    assert data["trades_journaled"] == 0
    assert data["unmapped_symbols"] == ["NSE:NIFTY24NOVFUT"]

    snap = (await db_client.get(f"/api/v1/brokers/connections/{conn.id}/snapshot", headers=headers)).json()["data"]
    assert snap["funds"]["available_cash"] == 130000.5

    # Another user can't touch this connection.
    stranger = await _user(db_client, "stranger@example.com")
    assert (await db_client.post(f"/api/v1/brokers/connections/{conn.id}/sync", headers=stranger)).status_code == 404

    portfolio_id = portfolio.id
    gone = await db_client.delete(f"/api/v1/brokers/connections/{conn.id}", headers=headers)
    assert gone.status_code == 200
    db_session.expire_all()
    assert await db_session.scalar(select(BrokerConnection)) is None
    assert len(await _journal(db_session, portfolio_id)) == 2  # history kept


async def _journal(db_session, portfolio_id):
    return (await db_session.execute(select(Trade).where(Trade.portfolio_id == portfolio_id))).scalars().all()


async def test_callback_rejects_unknown_or_mismatched_state(db_client, broker_settings):
    headers = await _user(db_client, "state@example.com")
    await db_client.post("/api/v1/brokers/fyers/connect", headers=headers)

    forged = await db_client.get("/api/v1/brokers/fyers/callback?auth_code=abc&state=forged")
    assert forged.status_code == 303
    assert "error=" in forged.headers["location"]


async def test_unconfigured_broker_cannot_connect(db_client):
    s = get_settings()
    saved = s.ANGELONE_API_KEY
    s.ANGELONE_API_KEY = ""
    try:
        headers = await _user(db_client, "noconf@example.com")
        response = await db_client.post("/api/v1/brokers/angelone/connect", headers=headers)
        assert response.status_code == 400
    finally:
        s.ANGELONE_API_KEY = saved


# ------------------------------------------------------- bring your own key


def _platform_keys_off():
    s = get_settings()
    saved = (s.FYERS_APP_ID, s.FYERS_SECRET_ID, s.ANGELONE_API_KEY)
    s.FYERS_APP_ID = s.FYERS_SECRET_ID = s.ANGELONE_API_KEY = ""
    return saved


@pytest.fixture
def no_platform_keys():
    s = get_settings()
    saved = _platform_keys_off()
    yield
    s.FYERS_APP_ID, s.FYERS_SECRET_ID, s.ANGELONE_API_KEY = saved


async def test_own_key_connects_with_the_users_app(db_client, db_session, instruments, no_platform_keys, monkeypatch):
    calls: list = []
    monkeypatch.setattr(
        "app.modules.brokers.service.get_adapter",
        lambda broker, credentials=None: FyersAdapter(
            client=httpx.AsyncClient(transport=fyers_transport(calls)), credentials=credentials
        ),
    )
    headers = await _user(db_client, "byok@example.com")

    # Without a platform app or an own key, connecting is refused.
    assert (await db_client.post("/api/v1/brokers/fyers/connect", headers=headers)).status_code == 400

    saved = await db_client.put(
        "/api/v1/brokers/fyers/credentials",
        json={"app_id": "MYAPP99-100", "app_secret": "my-own-secret"},
        headers=headers,
    )
    assert saved.status_code == 200
    assert "my-own-secret" not in saved.text and saved.json()["data"]["status"] == "pending"

    [fyers] = [b for b in (await db_client.get("/api/v1/brokers", headers=headers)).json()["data"]["brokers"] if b["broker"] == "fyers"]
    assert fyers["platform_configured"] is False and fyers["configured"] is True
    assert fyers["own_key"] == "MYAP…-100"
    assert fyers["redirect_uri"].endswith("/api/v1/brokers/fyers/callback")

    started = await db_client.post("/api/v1/brokers/fyers/connect", headers=headers)
    query = parse_qs(urlparse(started.json()["data"]["login_url"]).query)
    assert query["client_id"] == ["MYAPP99-100"]

    back = await db_client.get(f"/api/v1/brokers/fyers/callback?auth_code=abc&state={query['state'][0]}")
    assert back.headers["location"].endswith("/brokers?connected=fyers")

    # The code exchange was signed with the user's own secret.
    exchange = next(c for c in calls if c.url.path.endswith("/validate-authcode"))
    assert json.loads(exchange.content)["appIdHash"] == hashlib.sha256(b"MYAPP99-100:my-own-secret").hexdigest()

    conn = await db_session.scalar(select(BrokerConnection))
    assert conn.status == "active"
    assert conn.app_secret_enc and "my-own-secret" not in conn.app_secret_enc

    # Data calls also go out under the user's app ID.
    data_call = next(c for c in calls if c.url.path.endswith("/holdings"))
    assert data_call.headers["authorization"].startswith("MYAPP99-100:")

    # Someone else's account can't use this user's key.
    other = await _user(db_client, "byok-other@example.com")
    assert (await db_client.post("/api/v1/brokers/fyers/connect", headers=other)).status_code == 400

    removed = await db_client.delete("/api/v1/brokers/fyers/credentials", headers=headers)
    assert removed.status_code == 200
    db_session.expire_all()
    assert await db_session.scalar(select(BrokerConnection)) is None


@pytest.mark.parametrize(
    "broker, body",
    [
        ("fyers", {"app_id": "not an id", "app_secret": "secret123"}),
        ("fyers", {"app_id": "MYAPP99-100"}),  # Fyers needs the secret too
        ("angelone", {"app_id": "bad key!"}),
    ],
)
async def test_own_key_validation(db_client, no_platform_keys, broker, body):
    headers = await _user(db_client, f"val-{broker}-{len(body)}@example.com")
    response = await db_client.put(f"/api/v1/brokers/{broker}/credentials", json=body, headers=headers)
    assert response.status_code == 400


async def test_angel_own_key_needs_no_secret(db_client, db_session, no_platform_keys):
    headers = await _user(db_client, "angel-own@example.com")
    saved = await db_client.put("/api/v1/brokers/angelone/credentials", json={"app_id": "AbC123xyz"}, headers=headers)
    assert saved.status_code == 200
    started = await db_client.post("/api/v1/brokers/angelone/connect", headers=headers)
    assert "api_key=AbC123xyz" in started.json()["data"]["login_url"]

    # Saved but not signed in yet: syncing explains instead of erroring.
    conn = await db_session.scalar(select(BrokerConnection))
    synced = await db_client.post(f"/api/v1/brokers/connections/{conn.id}/sync", headers=headers)
    assert synced.status_code == 400
