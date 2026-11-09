"""
Paper trading engine.

A practice account trades with virtual cash at real market prices:
- MARKET orders fill at once at the last traded price.
- LIMIT orders fill at once if marketable, otherwise rest as OPEN and fill
  when the price crosses: checked whenever the account is read, and every
  few minutes in market hours by a background job.
- Long only: a SELL can't exceed the quantity held (no short selling yet).
- Fees approximate a discount broker: 0.03% of the order value, capped at
  ₹20 per order (taxes and exchange charges not modelled).

Every fill updates cash and positions, and is written to the trade journal
(trades/fills.py), so practice trades get the same review as real ones.
Prices are end-of-day or delayed quotes from the market-data provider.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging import get_logger
from app.modules.instruments.models import Instrument
from app.modules.instruments.repository import InstrumentRepository
from app.modules.paper.models import PaperAccount, PaperOrder
from app.modules.paper.schemas import (
    PaperAccountCreate,
    PaperAccountResponse,
    PaperOrderCreate,
    PaperOrderResponse,
    PaperPosition,
)
from app.modules.portfolio.models import Holding, Portfolio
from app.modules.trades.fills import Fill, record_fill
from app.modules.trades.models import JournalFill, Trade

logger = get_logger(__name__)

FEE_RATE = 0.0003
FEE_CAP = 20.0

PriceFn = Callable[[str], Awaitable[Optional[float]]]


async def _market_price(
    session: AsyncSession, symbol: str, user_id: Optional[uuid.UUID] = None
) -> Optional[float]:
    """Last traded price, live from the user's broker connection (None without one)."""
    from app.modules.market_data.service import MarketDataService

    try:
        quote = await MarketDataService(session).get_quote(symbol, user_id=user_id)
        return float(quote.price) if quote and quote.price else None
    except Exception as exc:  # no connection, broker error or unknown symbol
        logger.warning("paper_price_unavailable", symbol=symbol, error=str(exc))
        return None


def order_fees(notional: float) -> float:
    return round(min(FEE_CAP, notional * FEE_RATE), 2)


class PaperService:
    def __init__(
        self,
        session: AsyncSession,
        price_fn: Optional[PriceFn] = None,
        user_id: Optional[uuid.UUID] = None,
    ):
        self.session = session
        self.instruments = InstrumentRepository(session)
        self._price_fn = price_fn
        # Whose broker connection prices this account (the account owner).
        self._user_id = user_id
        # One quote per symbol per request: the cash check and the fill see
        # the same price, and the provider isn't asked twice.
        self._prices: dict[str, Optional[float]] = {}

    async def price(self, symbol: str) -> Optional[float]:
        if symbol not in self._prices:
            fetch = self._price_fn or (lambda s: _market_price(self.session, s, self._user_id))
            self._prices[symbol] = await fetch(symbol)
        return self._prices[symbol]

    # ------------------------------------------------------------------ accounts

    async def create_account(self, user_id: uuid.UUID, data: PaperAccountCreate) -> PaperAccountResponse:
        portfolio = Portfolio(user_id=user_id, name=f"{data.name} (paper)", kind="paper")
        self.session.add(portfolio)
        await self.session.flush()
        account = PaperAccount(
            user_id=user_id,
            portfolio_id=portfolio.id,
            name=data.name,
            starting_cash=data.starting_cash,
            cash=data.starting_cash,
        )
        self.session.add(account)
        await self.session.flush()
        return await self.account_view(account)

    async def list_accounts(self, user_id: uuid.UUID) -> list[PaperAccount]:
        return list(
            (
                await self.session.execute(
                    select(PaperAccount)
                    .where(PaperAccount.user_id == user_id)
                    .order_by(PaperAccount.created_at.asc())
                )
            ).scalars()
        )

    async def get_account(self, account_id: uuid.UUID, user_id: uuid.UUID) -> PaperAccount:
        account = await self.session.get(PaperAccount, account_id)
        if not account or account.user_id != user_id:
            raise NotFoundException("Paper account not found")
        return account

    async def reset_account(self, account: PaperAccount) -> PaperAccountResponse:
        """A clean slate: cash back to the start; orders, positions and journal cleared."""
        pid = account.portfolio_id
        await self.session.execute(delete(PaperOrder).where(PaperOrder.account_id == account.id))
        await self.session.execute(delete(Holding).where(Holding.portfolio_id == pid))
        await self.session.execute(delete(Trade).where(Trade.portfolio_id == pid))
        await self.session.execute(delete(JournalFill).where(JournalFill.portfolio_id == pid))
        account.cash = account.starting_cash
        account.reset_at = datetime.now(timezone.utc)
        await self.session.flush()
        return await self.account_view(account)

    async def account_view(self, account: PaperAccount) -> PaperAccountResponse:
        rows = (
            await self.session.execute(
                select(Holding, Instrument)
                .join(Instrument, Instrument.id == Holding.instrument_id)
                .where(Holding.portfolio_id == account.portfolio_id)
                .order_by(Instrument.symbol)
            )
        ).all()

        positions: list[PaperPosition] = []
        holdings_value = 0.0
        for holding, instrument in rows:
            qty = float(holding.quantity)
            avg = float(holding.average_price)
            last = await self.price(instrument.symbol)
            value = qty * last if last is not None else None
            # Without a price, value the position at cost rather than zero.
            holdings_value += value if value is not None else qty * avg
            pnl = (last - avg) * qty if last is not None else None
            positions.append(
                PaperPosition(
                    symbol=instrument.symbol,
                    name=instrument.name,
                    quantity=qty,
                    average_price=round(avg, 2),
                    last_price=last,
                    market_value=round(value, 2) if value is not None else None,
                    unrealized_pnl=round(pnl, 2) if pnl is not None else None,
                    unrealized_pnl_percent=round((last - avg) / avg * 100, 2)
                    if last is not None and avg
                    else None,
                )
            )

        open_orders = await self.session.scalar(
            select(func.count())
            .select_from(PaperOrder)
            .where(PaperOrder.account_id == account.id, PaperOrder.status == "OPEN")
        )
        cash = float(account.cash)
        start = float(account.starting_cash)
        equity = cash + holdings_value
        return PaperAccountResponse(
            id=account.id,
            name=account.name,
            portfolio_id=account.portfolio_id,
            starting_cash=start,
            cash=round(cash, 2),
            holdings_value=round(holdings_value, 2),
            equity=round(equity, 2),
            total_pnl=round(equity - start, 2),
            total_pnl_percent=round((equity - start) / start * 100, 2) if start else 0.0,
            open_orders=int(open_orders or 0),
            positions=positions,
            created_at=account.created_at,
            reset_at=account.reset_at,
        )

    # -------------------------------------------------------------------- orders

    async def list_orders(self, account: PaperAccount, limit: int = 100) -> list[PaperOrderResponse]:
        orders = (
            await self.session.execute(
                select(PaperOrder)
                .where(PaperOrder.account_id == account.id)
                .order_by(PaperOrder.created_at.desc())
                .limit(limit)
            )
        ).scalars()
        return [PaperOrderResponse.model_validate(o) for o in orders]

    async def place_order(self, account: PaperAccount, data: PaperOrderCreate) -> PaperOrderResponse:
        if self._price_fn is None:
            from app.modules.brokers.market import ensure_market_data

            # Paper fills use live prices from the user's own broker.
            await ensure_market_data(self.session, self._user_id)
        instrument = await self._instrument(data.symbol)
        order = PaperOrder(
            account_id=account.id,
            instrument_id=instrument.id,
            symbol=instrument.symbol,
            side=data.side,
            order_type=data.order_type,
            quantity=data.quantity,
            limit_price=data.limit_price,
            status="OPEN",
            strategy_tag=data.strategy_tag,
            notes=data.notes,
        )
        self.session.add(order)
        await self.session.flush()

        reason = await self._precheck(account, order)
        if reason:
            order.status = "REJECTED"
            order.reject_reason = reason
        else:
            await self._try_fill(account, order)

        await self.session.flush()
        return PaperOrderResponse.model_validate(order)

    async def cancel_order(self, account: PaperAccount, order_id: uuid.UUID) -> PaperOrderResponse:
        order = await self.session.get(PaperOrder, order_id)
        if not order or order.account_id != account.id:
            raise NotFoundException("Order not found")
        if order.status != "OPEN":
            raise BadRequestException("Only open orders can be cancelled")
        order.status = "CANCELLED"
        await self.session.flush()
        return PaperOrderResponse.model_validate(order)

    async def match_open_orders(self, account: PaperAccount) -> int:
        """Fill resting limit orders whose price has been reached. Returns fills."""
        orders = (
            await self.session.execute(
                select(PaperOrder)
                .where(PaperOrder.account_id == account.id, PaperOrder.status == "OPEN")
                .order_by(PaperOrder.created_at.asc())
            )
        ).scalars().all()
        filled = 0
        for order in orders:
            if await self._try_fill(account, order):
                filled += 1
        await self.session.flush()
        return filled

    # ------------------------------------------------------------------ internals

    async def _instrument(self, symbol: str) -> Instrument:
        symbol = symbol.strip().upper()
        instrument = await self.instruments.get_instrument_by_symbol(symbol)
        if instrument:
            return instrument
        # Unknown here yet: add it from the NSE symbol master.
        from app.modules.instruments.master import ensure_instrument

        instrument = await ensure_instrument(self.session, symbol)
        if not instrument or instrument.instrument_type != "EQUITY":
            raise BadRequestException(f"Couldn't find {symbol} on NSE")
        return instrument

    async def _held(self, account: PaperAccount, instrument_id: uuid.UUID) -> Optional[Holding]:
        return await self.session.scalar(
            select(Holding).where(
                Holding.portfolio_id == account.portfolio_id, Holding.instrument_id == instrument_id
            )
        )

    async def _precheck(self, account: PaperAccount, order: PaperOrder) -> Optional[str]:
        qty = float(order.quantity)
        if order.side == "SELL":
            holding = await self._held(account, order.instrument_id)
            held = float(holding.quantity) if holding else 0.0
            reserved = await self.session.scalar(
                select(func.coalesce(func.sum(PaperOrder.quantity), 0)).where(
                    PaperOrder.account_id == account.id,
                    PaperOrder.instrument_id == order.instrument_id,
                    PaperOrder.side == "SELL",
                    PaperOrder.status == "OPEN",
                    PaperOrder.id != order.id,
                )
            )
            if qty > held - float(reserved or 0):
                return f"You hold {held:g} {order.symbol}; short selling isn't supported yet"
            return None

        reference = (
            float(order.limit_price) if order.order_type == "LIMIT" else await self.price(order.symbol)
        )
        if reference is None:
            return f"No price available for {order.symbol} right now"
        needed = reference * qty + order_fees(reference * qty)
        if needed > float(account.cash):
            return f"Not enough cash: needs ₹{needed:,.2f}, available ₹{float(account.cash):,.2f}"
        return None

    async def _try_fill(self, account: PaperAccount, order: PaperOrder) -> bool:
        price = await self.price(order.symbol)
        if price is None:
            return False
        if order.order_type == "LIMIT":
            limit = float(order.limit_price)
            if (order.side == "BUY" and price > limit) or (order.side == "SELL" and price < limit):
                return False

        qty = float(order.quantity)
        notional = price * qty
        fees = order_fees(notional)
        holding = await self._held(account, order.instrument_id)

        if order.side == "BUY":
            if notional + fees > float(account.cash):
                order.status = "REJECTED"
                order.reject_reason = "Not enough cash when the price was reached"
                return False
            account.cash = float(account.cash) - notional - fees
            if holding:
                total = float(holding.quantity) + qty
                holding.average_price = (
                    float(holding.average_price) * float(holding.quantity) + notional
                ) / total
                holding.quantity = total
            else:
                self.session.add(
                    Holding(
                        portfolio_id=account.portfolio_id,
                        instrument_id=order.instrument_id,
                        quantity=qty,
                        average_price=price,
                        source="PAPER",
                    )
                )
        else:
            if not holding or float(holding.quantity) < qty:
                order.status = "REJECTED"
                order.reject_reason = "Position no longer large enough to sell"
                return False
            account.cash = float(account.cash) + notional - fees
            remaining = float(holding.quantity) - qty
            if remaining <= 0:
                await self.session.delete(holding)
            else:
                holding.quantity = remaining

        now = datetime.now(timezone.utc)
        order.status = "FILLED"
        order.fill_price = price
        order.fees = fees
        order.filled_at = now

        await record_fill(
            self.session,
            Fill(
                portfolio_id=account.portfolio_id,
                instrument_id=order.instrument_id,
                external_ref=f"paper:{order.id}",
                source="PAPER",
                side=order.side,
                quantity=qty,
                price=price,
                filled_at=now,
                fees=fees,
                strategy_tag=order.strategy_tag,
                notes=order.notes,
            ),
        )
        return True
