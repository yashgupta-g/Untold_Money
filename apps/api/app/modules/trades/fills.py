"""
Fill → journal. Turns executions (paper fills, broker trade-book rows) into
trade-journal entries, so every trade is journaled without retyping it.

Matching is FIFO on long positions:
- BUY opens a new OPEN trade.
- SELL closes the oldest OPEN buys for that instrument in that portfolio.
  A partial close splits the trade: the sold part becomes its own CLOSED
  trade, and the rest stays OPEN.
- A SELL with no open buy to match (shares bought before the account was
  linked) is journaled as a CLOSED trade against `fallback_entry_price`
  (the broker's average cost) when known, and skipped otherwise.

Every fill is recorded in `journal_fills` first, so a sync that sees the same
fill again is a no-op.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.trades.models import JournalFill, Trade


@dataclass(frozen=True)
class Fill:
    portfolio_id: uuid.UUID
    instrument_id: uuid.UUID
    external_ref: str
    source: str  # PAPER | ANGELONE | FYERS
    side: str  # BUY | SELL
    quantity: float
    price: float
    filled_at: datetime
    fees: float = 0.0
    strategy_tag: Optional[str] = None
    notes: Optional[str] = None


async def record_fill(
    session: AsyncSession,
    fill: Fill,
    fallback_entry_price: Optional[float] = None,
) -> bool:
    """Apply one fill to the journal. Returns False if it was already applied."""
    seen = await session.scalar(
        select(JournalFill.id).where(
            JournalFill.portfolio_id == fill.portfolio_id,
            JournalFill.external_ref == fill.external_ref,
        )
    )
    if seen:
        return False

    session.add(
        JournalFill(
            portfolio_id=fill.portfolio_id,
            instrument_id=fill.instrument_id,
            external_ref=fill.external_ref,
            source=fill.source,
            side=fill.side,
            quantity=fill.quantity,
            price=fill.price,
            filled_at=fill.filled_at,
        )
    )

    if fill.side == "BUY":
        session.add(_new_trade(fill, fill.quantity, entry=fill.price, status="OPEN", fees=fill.fees))
    else:
        await _close_fifo(session, fill, fallback_entry_price)

    await session.flush()
    return True


def _new_trade(
    fill: Fill,
    quantity: float,
    entry: float,
    status: str,
    fees: float,
    exit_price: Optional[float] = None,
    trade_time: Optional[datetime] = None,
    strategy_tag: Optional[str] = None,
) -> Trade:
    return Trade(
        portfolio_id=fill.portfolio_id,
        instrument_id=fill.instrument_id,
        trade_side="BUY",
        quantity=quantity,
        entry_price=entry,
        exit_price=exit_price,
        fees=fees,
        trade_status=status,
        source=fill.source,
        external_ref=fill.external_ref,
        strategy_tag=strategy_tag or fill.strategy_tag,
        notes=fill.notes,
        trade_time=trade_time or fill.filled_at,
    )


async def _close_fifo(
    session: AsyncSession, fill: Fill, fallback_entry_price: Optional[float]
) -> None:
    open_buys = (
        await session.execute(
            select(Trade)
            .where(
                Trade.portfolio_id == fill.portfolio_id,
                Trade.instrument_id == fill.instrument_id,
                Trade.trade_side == "BUY",
                Trade.trade_status == "OPEN",
            )
            .order_by(Trade.trade_time.asc(), Trade.created_at.asc())
        )
    ).scalars().all()

    remaining = float(fill.quantity)
    # Sell-side fees are spread over the closed lots by quantity.
    fee_per_unit = float(fill.fees) / remaining if remaining else 0.0

    for trade in open_buys:
        if remaining <= 0:
            break
        lot = float(trade.quantity)
        if lot <= remaining:
            trade.exit_price = fill.price
            trade.trade_status = "CLOSED"
            trade.fees = float(trade.fees) + fee_per_unit * lot
            remaining -= lot
        else:
            # Split: the sold part closes; the original keeps the rest open.
            entry_fees = float(trade.fees) * (remaining / lot)
            trade.quantity = lot - remaining
            trade.fees = float(trade.fees) - entry_fees
            session.add(
                _new_trade(
                    fill,
                    remaining,
                    entry=float(trade.entry_price),
                    status="CLOSED",
                    fees=entry_fees + fee_per_unit * remaining,
                    exit_price=fill.price,
                    trade_time=trade.trade_time,
                    strategy_tag=trade.strategy_tag,
                )
            )
            remaining = 0

    if remaining > 0 and fallback_entry_price:
        session.add(
            _new_trade(
                fill,
                remaining,
                entry=fallback_entry_price,
                status="CLOSED",
                fees=fee_per_unit * remaining,
                exit_price=fill.price,
            )
        )
