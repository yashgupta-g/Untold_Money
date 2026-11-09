"""
Paper trading engine: fills, cash, positions, limits, rejections, the
journal (FIFO with splits), idempotent fills, reset, and the HTTP routes.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.modules.instruments.models import Exchange, Instrument
from app.modules.paper.schemas import PaperAccountCreate, PaperOrderCreate
from app.modules.paper.service import PaperService, order_fees
from app.modules.portfolio.models import Holding
from app.modules.trades.fills import Fill, record_fill
from app.modules.trades.models import Trade
from app.modules.users.models import User


class Prices:
    """A controllable market: set prices per symbol between calls."""

    def __init__(self, **prices: float):
        self.prices = prices

    async def __call__(self, symbol: str):
        return self.prices.get(symbol)


@pytest.fixture
async def setup(db_session):
    user = User(full_name="Paper Trader", email=f"p-{uuid.uuid4().hex[:6]}@example.com", password_hash="x")
    exchange = Exchange(code="NSE", name="National Stock Exchange", country="IN")
    db_session.add_all([user, exchange])
    await db_session.flush()
    for symbol in ("RELIANCE", "TCS"):
        db_session.add(Instrument(exchange_id=exchange.id, symbol=symbol, name=symbol, instrument_type="EQUITY"))
    await db_session.commit()
    return user


async def _account(db_session, user, prices: Prices, cash: float = 100_000):
    service = PaperService(db_session, price_fn=prices)
    view = await service.create_account(user.id, PaperAccountCreate(name="Test", starting_cash=cash))
    account = await service.get_account(view.id, user.id)
    return service, account


async def _trades(db_session, portfolio_id) -> list[Trade]:
    return list(
        (
            await db_session.execute(
                select(Trade).where(Trade.portfolio_id == portfolio_id).order_by(Trade.trade_time, Trade.created_at)
            )
        ).scalars()
    )


async def test_market_buy_fills_and_moves_cash(db_session, setup):
    service, account = await _account(db_session, setup, Prices(RELIANCE=2500.0))
    order = await service.place_order(account, PaperOrderCreate(symbol="reliance", side="BUY", quantity=10))

    assert order.status == "FILLED"
    assert order.fill_price == 2500.0
    assert order.fees == order_fees(25_000) == 7.5
    assert float(account.cash) == pytest.approx(100_000 - 25_000 - 7.5)

    view = await service.account_view(account)
    assert view.positions[0].symbol == "RELIANCE"
    assert view.positions[0].quantity == 10
    assert view.equity == pytest.approx(100_000 - 7.5)


async def test_fee_is_capped(db_session, setup):
    service, account = await _account(db_session, setup, Prices(TCS=4000.0), cash=1_000_000)
    order = await service.place_order(account, PaperOrderCreate(symbol="TCS", side="BUY", quantity=100))
    assert order.fees == 20.0


async def test_insufficient_cash_is_rejected(db_session, setup):
    service, account = await _account(db_session, setup, Prices(RELIANCE=2500.0), cash=10_000)
    order = await service.place_order(account, PaperOrderCreate(symbol="RELIANCE", side="BUY", quantity=10))
    assert order.status == "REJECTED"
    assert "Not enough cash" in order.reject_reason
    assert float(account.cash) == 10_000


async def test_cannot_sell_more_than_held(db_session, setup):
    service, account = await _account(db_session, setup, Prices(RELIANCE=2500.0))
    await service.place_order(account, PaperOrderCreate(symbol="RELIANCE", side="BUY", quantity=5))
    order = await service.place_order(account, PaperOrderCreate(symbol="RELIANCE", side="SELL", quantity=6))
    assert order.status == "REJECTED"
    assert "short selling" in order.reject_reason


async def test_limit_buy_rests_then_fills_when_price_drops(db_session, setup):
    prices = Prices(RELIANCE=2500.0)
    service, account = await _account(db_session, setup, prices)
    order = await service.place_order(
        account,
        PaperOrderCreate(symbol="RELIANCE", side="BUY", order_type="LIMIT", quantity=10, limit_price=2400),
    )
    assert order.status == "OPEN"
    assert (await service.account_view(account)).open_orders == 1

    # A new request sees the new price (the cache is per request).
    prices.prices["RELIANCE"] = 2390.0
    later = PaperService(db_session, price_fn=prices)
    assert await later.match_open_orders(account) == 1
    filled = (await later.list_orders(account))[0]
    assert filled.status == "FILLED"
    assert filled.fill_price == 2390.0


async def test_cancel_open_order(db_session, setup):
    service, account = await _account(db_session, setup, Prices(RELIANCE=2500.0))
    order = await service.place_order(
        account,
        PaperOrderCreate(symbol="RELIANCE", side="BUY", order_type="LIMIT", quantity=1, limit_price=2000),
    )
    cancelled = await service.cancel_order(account, order.id)
    assert cancelled.status == "CANCELLED"


async def test_fills_journal_fifo_with_partial_close(db_session, setup):
    prices = Prices(RELIANCE=100.0)
    service, account = await _account(db_session, setup, prices)
    await service.place_order(account, PaperOrderCreate(symbol="RELIANCE", side="BUY", quantity=10))
    prices.prices["RELIANCE"] = 110.0
    service = PaperService(db_session, price_fn=prices)
    await service.place_order(account, PaperOrderCreate(symbol="RELIANCE", side="BUY", quantity=10))
    prices.prices["RELIANCE"] = 120.0
    service = PaperService(db_session, price_fn=prices)
    await service.place_order(account, PaperOrderCreate(symbol="RELIANCE", side="SELL", quantity=15))

    trades = await _trades(db_session, account.portfolio_id)
    closed = sorted((t for t in trades if t.trade_status == "CLOSED"), key=lambda t: float(t.entry_price))
    still_open = [t for t in trades if t.trade_status == "OPEN"]

    # First lot fully closed at 120; 5 of the second lot split off and closed.
    assert [(float(t.quantity), float(t.entry_price), float(t.exit_price)) for t in closed] == [
        (10.0, 100.0, 120.0),
        (5.0, 110.0, 120.0),
    ]
    assert [(float(t.quantity), float(t.entry_price)) for t in still_open] == [(5.0, 110.0)]
    assert all(t.source == "PAPER" for t in trades)

    holding = await db_session.scalar(select(Holding).where(Holding.portfolio_id == account.portfolio_id))
    assert float(holding.quantity) == 5


async def test_record_fill_is_idempotent(db_session, setup):
    service, account = await _account(db_session, setup, Prices())
    instrument = await db_session.scalar(select(Instrument).where(Instrument.symbol == "TCS"))
    fill = Fill(
        portfolio_id=account.portfolio_id,
        instrument_id=instrument.id,
        external_ref="broker:T1",
        source="FYERS",
        side="BUY",
        quantity=3,
        price=4000,
        filled_at=datetime.now(timezone.utc),
    )
    assert await record_fill(db_session, fill) is True
    assert await record_fill(db_session, fill) is False
    assert len(await _trades(db_session, account.portfolio_id)) == 1


async def test_unmatched_sell_uses_broker_average_cost(db_session, setup):
    service, account = await _account(db_session, setup, Prices())
    instrument = await db_session.scalar(select(Instrument).where(Instrument.symbol == "TCS"))
    await record_fill(
        db_session,
        Fill(
            portfolio_id=account.portfolio_id,
            instrument_id=instrument.id,
            external_ref="broker:S1",
            source="ANGELONE",
            side="SELL",
            quantity=2,
            price=4200,
            filled_at=datetime.now(timezone.utc),
        ),
        fallback_entry_price=3900,
    )
    [trade] = await _trades(db_session, account.portfolio_id)
    assert (trade.trade_status, float(trade.entry_price), float(trade.exit_price)) == ("CLOSED", 3900, 4200)


async def test_reset_restores_cash_and_clears_everything(db_session, setup):
    service, account = await _account(db_session, setup, Prices(RELIANCE=2500.0))
    await service.place_order(account, PaperOrderCreate(symbol="RELIANCE", side="BUY", quantity=10))
    view = await service.reset_account(account)
    assert view.cash == 100_000
    assert view.positions == []
    assert await _trades(db_session, account.portfolio_id) == []
    assert await service.list_orders(account) == []


async def test_http_flow(db_client: AsyncClient, monkeypatch):
    async def fake_price(_session, symbol, _user_id=None):
        return {"RELIANCE": 2500.0}.get(symbol)

    monkeypatch.setattr("app.modules.paper.service._market_price", fake_price)

    reg = await db_client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Http Trader",
            "email": "http-paper@example.com",
            "password": "Str0ngPassw0rd",
            "accept_terms": True,
            "accept_privacy": True,
        },
    )
    headers = {"Authorization": f"Bearer {reg.json()['data']['tokens']['access_token']}"}

    created = await db_client.post("/api/v1/paper/accounts", json={"starting_cash": 50_000}, headers=headers)
    assert created.status_code == 201
    account_id = created.json()["data"]["id"]

    other = await db_client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Someone Else",
            "email": "other-paper@example.com",
            "password": "Str0ngPassw0rd",
            "accept_terms": True,
            "accept_privacy": True,
        },
    )
    other_headers = {"Authorization": f"Bearer {other.json()['data']['tokens']['access_token']}"}
    assert (await db_client.get(f"/api/v1/paper/accounts/{account_id}", headers=other_headers)).status_code == 404

    bad = await db_client.post(
        f"/api/v1/paper/accounts/{account_id}/orders",
        json={"symbol": "RELIANCE", "side": "BUY", "order_type": "LIMIT", "quantity": 1},
        headers=headers,
    )
    assert bad.status_code == 422  # a limit order needs a price


async def test_validation_errors_never_echo_input(db_client: AsyncClient):
    response = await db_client.post(
        "/api/v1/auth/register",
        json={"full_name": "X", "email": "not-an-email", "password": "S3cretPassw0rd"},
    )
    assert response.status_code == 422
    assert "S3cretPassw0rd" not in response.text
