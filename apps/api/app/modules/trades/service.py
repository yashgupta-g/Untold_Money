"""
Trade service — business logic for trade journaling.
Includes PnL calculation, ownership validation, comprehensive analytics
(profit factor, expectancy, tag breakdowns), and audit logging.
"""

from __future__ import annotations

import uuid
from collections import Counter, defaultdict
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.core.logging import get_logger
from app.modules.audit.service import AuditService
from app.modules.instruments.repository import InstrumentRepository
from app.modules.portfolio.repository import PortfolioRepository
from app.modules.trades.models import Trade
from app.modules.trades.repository import TradeRepository
from app.modules.trades.schemas import (
    TagPerformance,
    TradeAnalyticsSummary,
    TradeCreateRequest,
    TradeResponse,
    TradeUpdateRequest,
)

logger = get_logger(__name__)


class TradeService:
    """Business logic for trade journal operations."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = TradeRepository(session)
        self.portfolio_repo = PortfolioRepository(session)
        self.instrument_repo = InstrumentRepository(session)
        self.audit = AuditService(session)

    async def _get_user_portfolio_ids(self, user_id: uuid.UUID) -> list[uuid.UUID]:
        """Get all portfolio IDs owned by this user for scoped queries."""
        portfolios = await self.portfolio_repo.list_portfolios(user_id)
        return [p.id for p in portfolios]

    @staticmethod
    def _compute_pnl(trade: Trade) -> Optional[float]:
        """Calculate PnL for a single trade. Returns None if no exit price."""
        if not trade.exit_price or not trade.entry_price:
            return None
        qty = float(trade.quantity)
        entry = float(trade.entry_price)
        exit_p = float(trade.exit_price)
        fees = float(trade.fees)

        if trade.trade_side == "BUY":
            return (exit_p - entry) * qty - fees
        else:
            return (entry - exit_p) * qty - fees

    def _enrich_trade(self, trade: Trade, symbol: Optional[str] = None, name: Optional[str] = None) -> TradeResponse:
        """Convert ORM model to response with PnL calculation."""
        resp = TradeResponse.model_validate(trade)
        resp.symbol = symbol
        resp.name = name

        pnl = self._compute_pnl(trade)
        if pnl is not None:
            resp.pnl = round(pnl, 2)
            invested = float(trade.entry_price) * float(trade.quantity)
            resp.pnl_percent = round((pnl / invested) * 100, 2) if invested > 0 else 0.0

        return resp

    # ---------- CRUD ----------

    async def list_trades(
        self,
        user_id: uuid.UUID,
        portfolio_id: Optional[uuid.UUID] = None,
        trade_side: Optional[str] = None,
        trade_status: Optional[str] = None,
        strategy_tag: Optional[str] = None,
        symbol: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[TradeResponse]:
        portfolio_ids = await self._get_user_portfolio_ids(user_id)
        if not portfolio_ids:
            return []

        # Resolve symbol → instrument IDs
        instrument_ids = None
        if symbol:
            instrument_ids = await self.repo.find_instrument_ids_by_symbol(symbol)
            if not instrument_ids:
                return []  # No matching instruments

        trades = await self.repo.list_trades(
            portfolio_ids=portfolio_ids,
            portfolio_id=portfolio_id,
            trade_side=trade_side,
            trade_status=trade_status,
            strategy_tag=strategy_tag,
            instrument_ids=instrument_ids,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset,
        )

        results = []
        for t in trades:
            instrument = await self.instrument_repo.get_instrument_by_id(t.instrument_id)
            sym = instrument.symbol if instrument else None
            nm = instrument.name if instrument else None
            results.append(self._enrich_trade(t, sym, nm))
        return results

    async def get_trade(self, trade_id: uuid.UUID, user_id: uuid.UUID) -> TradeResponse:
        trade = await self.repo.get_trade_by_id(trade_id)
        if not trade:
            raise NotFoundException("Trade not found")

        # Verify ownership
        portfolio_ids = await self._get_user_portfolio_ids(user_id)
        if trade.portfolio_id not in portfolio_ids:
            raise ForbiddenException("Not authorized to access this trade")

        instrument = await self.instrument_repo.get_instrument_by_id(trade.instrument_id)
        return self._enrich_trade(
            trade,
            instrument.symbol if instrument else None,
            instrument.name if instrument else None,
        )

    async def create_trade(
        self, user_id: uuid.UUID, data: TradeCreateRequest
    ) -> TradeResponse:
        # Verify portfolio ownership
        portfolio = await self.portfolio_repo.get_portfolio_by_id(data.portfolio_id, user_id)
        if not portfolio:
            raise NotFoundException("Portfolio not found")

        # Verify instrument exists
        instrument = await self.instrument_repo.get_instrument_by_id(data.instrument_id)
        if not instrument:
            raise NotFoundException("Instrument not found")

        trade = Trade(
            portfolio_id=data.portfolio_id,
            instrument_id=data.instrument_id,
            trade_side=data.trade_side.upper(),
            quantity=data.quantity,
            entry_price=data.entry_price,
            exit_price=data.exit_price,
            stop_loss=data.stop_loss,
            target_price=data.target_price,
            fees=data.fees,
            trade_status=data.trade_status.upper(),
            strategy_tag=data.strategy_tag,
            mistake_tag=data.mistake_tag,
            emotion_tag=data.emotion_tag,
            notes=data.notes,
            trade_time=data.trade_time,
        )
        trade = await self.repo.create_trade(trade)

        # Audit log
        await self.audit.log_event(
            action="trade_created",
            entity_type="trade",
            entity_id=str(trade.id),
            actor_user_id=user_id,
            metadata={
                "portfolio_id": str(data.portfolio_id),
                "symbol": instrument.symbol,
                "trade_side": trade.trade_side,
                "quantity": data.quantity,
                "entry_price": data.entry_price,
                "trade_status": trade.trade_status,
            },
        )

        logger.info("trade_created", side=trade.trade_side, symbol=instrument.symbol)
        return self._enrich_trade(trade, instrument.symbol, instrument.name)

    async def update_trade(
        self, trade_id: uuid.UUID, user_id: uuid.UUID, data: TradeUpdateRequest
    ) -> TradeResponse:
        trade = await self.repo.get_trade_by_id(trade_id)
        if not trade:
            raise NotFoundException("Trade not found")

        portfolio_ids = await self._get_user_portfolio_ids(user_id)
        if trade.portfolio_id not in portfolio_ids:
            raise ForbiddenException("Not authorized to update this trade")

        old_status = trade.trade_status
        update_data = data.model_dump(exclude_unset=True)
        old_values = {k: getattr(trade, k) for k in update_data}

        for field, value in update_data.items():
            setattr(trade, field, value)

        trade = await self.repo.update_trade(trade)
        instrument = await self.instrument_repo.get_instrument_by_id(trade.instrument_id)

        # Detect trade_closed event
        new_status = trade.trade_status
        action = "trade_updated"
        if old_status == "OPEN" and new_status == "CLOSED":
            action = "trade_closed"

        await self.audit.log_event(
            action=action,
            entity_type="trade",
            entity_id=str(trade_id),
            actor_user_id=user_id,
            metadata={
                "symbol": instrument.symbol if instrument else None,
                "changes": {
                    k: {"old": str(v), "new": str(update_data[k])}
                    for k, v in old_values.items()
                },
            },
        )

        logger.info(action, id=str(trade_id))
        return self._enrich_trade(
            trade,
            instrument.symbol if instrument else None,
            instrument.name if instrument else None,
        )

    async def delete_trade(self, trade_id: uuid.UUID, user_id: uuid.UUID) -> None:
        trade = await self.repo.get_trade_by_id(trade_id)
        if not trade:
            raise NotFoundException("Trade not found")

        portfolio_ids = await self._get_user_portfolio_ids(user_id)
        if trade.portfolio_id not in portfolio_ids:
            raise ForbiddenException("Not authorized to delete this trade")

        # Audit log before deletion
        instrument = await self.instrument_repo.get_instrument_by_id(trade.instrument_id)
        await self.audit.log_event(
            action="trade_deleted",
            entity_type="trade",
            entity_id=str(trade_id),
            actor_user_id=user_id,
            metadata={
                "symbol": instrument.symbol if instrument else None,
                "trade_side": trade.trade_side,
                "quantity": float(trade.quantity),
                "entry_price": float(trade.entry_price),
                "exit_price": float(trade.exit_price) if trade.exit_price else None,
            },
        )

        await self.repo.delete_trade(trade)
        logger.info("trade_deleted", id=str(trade_id))

    # ---------- Analytics ----------

    async def get_analytics_summary(self, user_id: uuid.UUID) -> TradeAnalyticsSummary:
        """
        Comprehensive trade analytics:
        - Win/loss stats, profit factor, expectancy
        - Best/worst strategy tag performance
        - Most common mistake tag
        """
        portfolio_ids = await self._get_user_portfolio_ids(user_id)
        if not portfolio_ids:
            return TradeAnalyticsSummary(
                total_trades=0, open_trades=0, closed_trades=0,
                total_pnl=0.0, win_count=0, loss_count=0,
                win_rate=0.0, avg_win=0.0, avg_loss=0.0,
                profit_factor=0.0, expectancy=0.0,
                best_trade_pnl=0.0, worst_trade_pnl=0.0,
            )

        closed_trades = await self.repo.list_all_closed_trades(portfolio_ids)
        open_count = await self.repo.count_trades(portfolio_ids, trade_status="OPEN")
        total_count = await self.repo.count_trades(portfolio_ids)

        # Compute PnL for each closed trade
        pnl_list: list[float] = []
        win_pnls: list[float] = []
        loss_pnls: list[float] = []
        strategy_pnls: dict[str, list[float]] = defaultdict(list)
        mistake_counter: Counter = Counter()

        for t in closed_trades:
            pnl = self._compute_pnl(t)
            if pnl is None:
                continue

            pnl_list.append(pnl)
            if pnl >= 0:
                win_pnls.append(pnl)
            else:
                loss_pnls.append(pnl)

            # Track strategy performance
            if t.strategy_tag:
                strategy_pnls[t.strategy_tag].append(pnl)

            # Track mistake frequency
            if t.mistake_tag:
                mistake_counter[t.mistake_tag] += 1

        closed_count = len(pnl_list)
        win_count = len(win_pnls)
        loss_count = len(loss_pnls)
        total_pnl = sum(pnl_list)

        win_rate = round((win_count / closed_count) * 100, 2) if closed_count > 0 else 0.0
        avg_win = round(sum(win_pnls) / win_count, 2) if win_count > 0 else 0.0
        avg_loss = round(abs(sum(loss_pnls)) / loss_count, 2) if loss_count > 0 else 0.0

        # Profit factor = gross_wins / abs(gross_losses)
        gross_wins = sum(win_pnls)
        gross_losses = abs(sum(loss_pnls))
        profit_factor = round(gross_wins / gross_losses, 2) if gross_losses > 0 else 0.0

        # Expectancy = (win_rate/100 * avg_win) - (loss_rate/100 * avg_loss)
        loss_rate = 100 - win_rate
        expectancy = round(((win_rate / 100) * avg_win) - ((loss_rate / 100) * avg_loss), 2)

        best_trade_pnl = round(max(pnl_list), 2) if pnl_list else 0.0
        worst_trade_pnl = round(min(pnl_list), 2) if pnl_list else 0.0

        # Best & worst strategy
        best_strategy: Optional[TagPerformance] = None
        worst_strategy: Optional[TagPerformance] = None

        if strategy_pnls:
            strategy_summaries = []
            for tag, pnls in strategy_pnls.items():
                t_pnl = sum(pnls)
                t_wins = sum(1 for p in pnls if p >= 0)
                t_wr = round((t_wins / len(pnls)) * 100, 2)
                strategy_summaries.append(
                    TagPerformance(
                        tag=tag,
                        trade_count=len(pnls),
                        total_pnl=round(t_pnl, 2),
                        win_rate=t_wr,
                    )
                )
            strategy_summaries.sort(key=lambda x: x.total_pnl, reverse=True)
            best_strategy = strategy_summaries[0]
            worst_strategy = strategy_summaries[-1]

        # Most common mistake
        most_common_mistake: Optional[str] = None
        most_common_mistake_count = 0
        if mistake_counter:
            most_common = mistake_counter.most_common(1)[0]
            most_common_mistake = most_common[0]
            most_common_mistake_count = most_common[1]

        return TradeAnalyticsSummary(
            total_trades=total_count,
            open_trades=open_count,
            closed_trades=closed_count,
            total_pnl=round(total_pnl, 2),
            win_count=win_count,
            loss_count=loss_count,
            win_rate=win_rate,
            avg_win=avg_win,
            avg_loss=avg_loss,
            profit_factor=profit_factor,
            expectancy=expectancy,
            best_trade_pnl=best_trade_pnl,
            worst_trade_pnl=worst_trade_pnl,
            best_strategy=best_strategy,
            worst_strategy=worst_strategy,
            most_common_mistake=most_common_mistake,
            most_common_mistake_count=most_common_mistake_count,
        )
