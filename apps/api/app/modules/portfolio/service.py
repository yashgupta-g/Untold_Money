"""
Portfolio service — business logic for portfolio and holding management.
Includes PnL enrichment using real candle data with Yahoo Finance fallback,
summary/allocation analytics, and audit logging.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.core.logging import get_logger
from app.modules.audit.service import AuditService
from app.modules.instruments.models import Instrument
from app.modules.instruments.repository import InstrumentRepository
from app.modules.market_data.providers.yahoo_provider import YahooFinanceProvider
from app.modules.portfolio.models import Holding, Portfolio
from app.modules.portfolio.repository import PortfolioRepository
from app.modules.portfolio.schemas import (
    AllocationItem,
    HoldingCreateRequest,
    HoldingResponse,
    HoldingSummaryItem,
    HoldingUpdateRequest,
    PortfolioAllocationResponse,
    PortfolioCreateRequest,
    PortfolioDetailResponse,
    PortfolioResponse,
    PortfolioSummaryResponse,
    PortfolioUpdateRequest,
    SectorAllocation,
)

logger = get_logger(__name__)
MAX_PORTFOLIOS_PER_USER = 10

# Concentration risk threshold: flag if any single holding > 30%
CONCENTRATION_THRESHOLD = 30.0


class PortfolioService:
    """Business logic for portfolios and holdings."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = PortfolioRepository(session)
        self.instrument_repo = InstrumentRepository(session)
        self.provider = YahooFinanceProvider()
        self.audit = AuditService(session)

    # ---------- Price helpers ----------

    async def _get_current_price(self, instrument: Instrument) -> Optional[float]:
        """
        Get current price for an instrument.
        Priority: stored candle close → Yahoo Finance provider fallback.
        """
        # Try DB candle first
        price = await self.repo.get_latest_candle_price(instrument.id)
        if price is not None:
            return price

        # Fallback to Yahoo Finance provider
        try:
            quote = await self.provider.get_quote(instrument.symbol)
            return quote.price
        except Exception:
            return None

    async def _get_current_prices_batch(
        self, instruments: dict[uuid.UUID, Instrument]
    ) -> dict[uuid.UUID, float]:
        """
        Batch-fetch current prices for multiple instruments.
        Uses DB candles first, falls back to Yahoo Finance for any missing.
        """
        instrument_ids = list(instruments.keys())
        prices = await self.repo.get_latest_candle_prices(instrument_ids)

        # Fill missing with Yahoo Finance provider
        for iid, inst in instruments.items():
            if iid not in prices:
                try:
                    quote = await self.provider.get_quote(inst.symbol)
                    prices[iid] = quote.price
                except Exception:
                    pass

        return prices

    # ---------- Enrichment ----------

    async def _enrich_holdings(
        self, holdings: list[Holding]
    ) -> tuple[list[HoldingResponse], float, float]:
        """
        Enrich holdings with instrument info and current prices.
        Returns (enriched_holdings, total_invested, total_value).
        """
        if not holdings:
            return [], 0.0, 0.0

        # Batch-load instruments
        instruments: dict[uuid.UUID, Instrument] = {}
        for h in holdings:
            if h.instrument_id not in instruments:
                inst = await self.instrument_repo.get_instrument_by_id(h.instrument_id)
                if inst:
                    instruments[h.instrument_id] = inst

        # Batch-fetch prices
        prices = await self._get_current_prices_batch(instruments)

        enriched: list[HoldingResponse] = []
        total_invested = 0.0
        total_value = 0.0

        for h in holdings:
            resp = HoldingResponse.model_validate(h)
            inst = instruments.get(h.instrument_id)

            if inst:
                resp.symbol = inst.symbol
                resp.name = inst.name

                current_price = prices.get(h.instrument_id)
                invested = float(h.quantity) * float(h.average_price)
                total_invested += invested

                if current_price is not None:
                    resp.current_price = round(current_price, 2)
                    market_val = float(h.quantity) * current_price
                    resp.market_value = round(market_val, 2)
                    resp.pnl = round(market_val - invested, 2)
                    resp.pnl_percent = (
                        round(((market_val - invested) / invested) * 100, 2)
                        if invested > 0
                        else 0.0
                    )
                    total_value += market_val
                else:
                    total_value += invested
            else:
                invested = float(h.quantity) * float(h.average_price)
                total_invested += invested
                total_value += invested

            enriched.append(resp)

        return enriched, total_invested, total_value

    # ---------- Portfolio CRUD ----------

    async def list_portfolios(self, user_id: uuid.UUID) -> list[PortfolioResponse]:
        portfolios = await self.repo.list_portfolios(user_id)
        results = []
        for p in portfolios:
            resp = PortfolioResponse.model_validate(p)
            resp.holdings_count = len(p.holdings)

            if p.holdings:
                _, total_invested, total_value = await self._enrich_holdings(p.holdings)
                resp.total_invested = round(total_invested, 2)
                resp.total_value = round(total_value, 2)
                resp.total_pnl = round(total_value - total_invested, 2)
                resp.pnl_percent = (
                    round(((total_value - total_invested) / total_invested) * 100, 2)
                    if total_invested > 0
                    else 0.0
                )
            else:
                resp.total_invested = 0.0
                resp.total_value = 0.0
                resp.total_pnl = 0.0
                resp.pnl_percent = 0.0

            results.append(resp)
        return results

    async def get_portfolio(
        self, portfolio_id: uuid.UUID, user_id: uuid.UUID
    ) -> PortfolioDetailResponse:
        portfolio = await self.repo.get_portfolio_by_id(portfolio_id, user_id)
        if not portfolio:
            raise NotFoundException("Portfolio not found")

        resp = PortfolioDetailResponse.model_validate(portfolio)
        resp.holdings_count = len(portfolio.holdings)

        enriched, total_invested, total_value = await self._enrich_holdings(portfolio.holdings)

        resp.holdings = enriched
        resp.total_invested = round(total_invested, 2)
        resp.total_value = round(total_value, 2)
        resp.total_pnl = round(total_value - total_invested, 2)
        resp.pnl_percent = (
            round(((total_value - total_invested) / total_invested) * 100, 2)
            if total_invested > 0
            else 0.0
        )
        return resp

    async def create_portfolio(
        self, user_id: uuid.UUID, data: PortfolioCreateRequest
    ) -> PortfolioResponse:
        count = await self.repo.count_portfolios(user_id)
        if count >= MAX_PORTFOLIOS_PER_USER:
            raise ConflictException(
                f"Maximum of {MAX_PORTFOLIOS_PER_USER} portfolios allowed"
            )

        portfolio = Portfolio(
            user_id=user_id,
            name=data.name,
            base_currency=data.base_currency.upper(),
        )
        portfolio = await self.repo.create_portfolio(portfolio)

        # Audit log
        await self.audit.log_event(
            action="portfolio_created",
            entity_type="portfolio",
            entity_id=str(portfolio.id),
            actor_user_id=user_id,
            metadata={"name": portfolio.name, "base_currency": portfolio.base_currency},
        )

        logger.info("portfolio_created", name=portfolio.name, user_id=str(user_id))
        resp = PortfolioResponse.model_validate(portfolio)
        resp.holdings_count = 0
        resp.total_invested = 0.0
        resp.total_value = 0.0
        resp.total_pnl = 0.0
        resp.pnl_percent = 0.0
        return resp

    async def update_portfolio(
        self, portfolio_id: uuid.UUID, user_id: uuid.UUID, data: PortfolioUpdateRequest
    ) -> PortfolioResponse:
        portfolio = await self.repo.get_portfolio_by_id(portfolio_id, user_id)
        if not portfolio:
            raise NotFoundException("Portfolio not found")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(portfolio, field, value)

        portfolio = await self.repo.update_portfolio(portfolio)
        logger.info("portfolio_updated", id=str(portfolio_id))
        return PortfolioResponse.model_validate(portfolio)

    async def delete_portfolio(
        self, portfolio_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        portfolio = await self.repo.get_portfolio_by_id(portfolio_id, user_id)
        if not portfolio:
            raise NotFoundException("Portfolio not found")
        await self.repo.delete_portfolio(portfolio)
        logger.info("portfolio_deleted", id=str(portfolio_id))

    # ---------- Holding CRUD ----------

    async def add_holding(
        self, portfolio_id: uuid.UUID, user_id: uuid.UUID, data: HoldingCreateRequest
    ) -> HoldingResponse:
        portfolio = await self.repo.get_portfolio_by_id(portfolio_id, user_id)
        if not portfolio:
            raise NotFoundException("Portfolio not found")

        # Verify instrument exists
        instrument = await self.instrument_repo.get_instrument_by_id(data.instrument_id)
        if not instrument:
            raise NotFoundException("Instrument not found")

        # Check for duplicate
        existing = await self.repo.get_holding_by_instrument(portfolio_id, data.instrument_id)
        if existing:
            raise ConflictException(
                f"{instrument.symbol} already exists in this portfolio. Update the existing holding instead."
            )

        holding = Holding(
            portfolio_id=portfolio_id,
            instrument_id=data.instrument_id,
            quantity=data.quantity,
            average_price=data.average_price,
            source=data.source,
        )
        holding = await self.repo.create_holding(holding)

        # Audit log
        await self.audit.log_event(
            action="holding_added",
            entity_type="holding",
            entity_id=str(holding.id),
            actor_user_id=user_id,
            metadata={
                "portfolio_id": str(portfolio_id),
                "instrument_id": str(data.instrument_id),
                "symbol": instrument.symbol,
                "quantity": data.quantity,
                "average_price": data.average_price,
            },
        )

        logger.info("holding_created", symbol=instrument.symbol, portfolio=str(portfolio_id))

        resp = HoldingResponse.model_validate(holding)
        resp.symbol = instrument.symbol
        resp.name = instrument.name
        return resp

    async def update_holding(
        self,
        portfolio_id: uuid.UUID,
        holding_id: uuid.UUID,
        user_id: uuid.UUID,
        data: HoldingUpdateRequest,
    ) -> HoldingResponse:
        # Verify ownership
        portfolio = await self.repo.get_portfolio_by_id(portfolio_id, user_id)
        if not portfolio:
            raise NotFoundException("Portfolio not found")

        holding = await self.repo.get_holding_by_id(holding_id, portfolio_id)
        if not holding:
            raise NotFoundException("Holding not found")

        update_data = data.model_dump(exclude_unset=True)
        old_values = {k: getattr(holding, k) for k in update_data}
        for field, value in update_data.items():
            setattr(holding, field, value)

        holding = await self.repo.update_holding(holding)

        # Audit log
        instrument = await self.instrument_repo.get_instrument_by_id(holding.instrument_id)
        await self.audit.log_event(
            action="holding_updated",
            entity_type="holding",
            entity_id=str(holding_id),
            actor_user_id=user_id,
            metadata={
                "portfolio_id": str(portfolio_id),
                "symbol": instrument.symbol if instrument else None,
                "changes": {k: {"old": float(v), "new": float(update_data[k])} for k, v in old_values.items()},
            },
        )

        resp = HoldingResponse.model_validate(holding)
        if instrument:
            resp.symbol = instrument.symbol
            resp.name = instrument.name
        return resp

    async def remove_holding(
        self, portfolio_id: uuid.UUID, holding_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        portfolio = await self.repo.get_portfolio_by_id(portfolio_id, user_id)
        if not portfolio:
            raise NotFoundException("Portfolio not found")

        holding = await self.repo.get_holding_by_id(holding_id, portfolio_id)
        if not holding:
            raise NotFoundException("Holding not found")

        # Audit log before deletion
        instrument = await self.instrument_repo.get_instrument_by_id(holding.instrument_id)
        await self.audit.log_event(
            action="holding_deleted",
            entity_type="holding",
            entity_id=str(holding_id),
            actor_user_id=user_id,
            metadata={
                "portfolio_id": str(portfolio_id),
                "symbol": instrument.symbol if instrument else None,
                "quantity": float(holding.quantity),
                "average_price": float(holding.average_price),
            },
        )

        await self.repo.delete_holding(holding)
        logger.info("holding_deleted", id=str(holding_id), portfolio=str(portfolio_id))

    # ---------- Summary ----------

    async def get_portfolio_summary(
        self, portfolio_id: uuid.UUID, user_id: uuid.UUID
    ) -> PortfolioSummaryResponse:
        """Compute aggregated portfolio analytics."""
        portfolio = await self.repo.get_portfolio_by_id(portfolio_id, user_id)
        if not portfolio:
            raise NotFoundException("Portfolio not found")

        enriched, total_invested, total_value = await self._enrich_holdings(portfolio.holdings)

        unrealized_pnl = total_value - total_invested
        unrealized_pnl_percent = (
            round(((total_value - total_invested) / total_invested) * 100, 2)
            if total_invested > 0
            else 0.0
        )

        # Find top gainer and loser
        top_gainer: Optional[HoldingSummaryItem] = None
        top_loser: Optional[HoldingSummaryItem] = None

        for h in enriched:
            if h.pnl is None or h.symbol is None:
                continue
            item = HoldingSummaryItem(
                symbol=h.symbol,
                name=h.name or h.symbol,
                pnl=h.pnl,
                pnl_percent=h.pnl_percent or 0.0,
            )
            if top_gainer is None or h.pnl > top_gainer.pnl:
                top_gainer = item
            if top_loser is None or h.pnl < top_loser.pnl:
                top_loser = item

        return PortfolioSummaryResponse(
            portfolio_id=portfolio.id,
            name=portfolio.name,
            total_invested=round(total_invested, 2),
            total_value=round(total_value, 2),
            unrealized_pnl=round(unrealized_pnl, 2),
            unrealized_pnl_percent=unrealized_pnl_percent,
            holdings_count=len(portfolio.holdings),
            top_gainer=top_gainer if top_gainer and top_gainer.pnl > 0 else None,
            top_loser=top_loser if top_loser and top_loser.pnl < 0 else None,
        )

    # ---------- Allocation ----------

    async def get_portfolio_allocation(
        self, portfolio_id: uuid.UUID, user_id: uuid.UUID
    ) -> PortfolioAllocationResponse:
        """Compute per-holding and sector allocation with concentration risk detection."""
        portfolio = await self.repo.get_portfolio_by_id(portfolio_id, user_id)
        if not portfolio:
            raise NotFoundException("Portfolio not found")

        enriched, _, total_value = await self._enrich_holdings(portfolio.holdings)

        # Build instrument lookup for sector info
        instruments: dict[uuid.UUID, Instrument] = {}
        for h in portfolio.holdings:
            if h.instrument_id not in instruments:
                inst = await self.instrument_repo.get_instrument_by_id(h.instrument_id)
                if inst:
                    instruments[h.instrument_id] = inst

        # Per-holding allocation
        allocation_items: list[AllocationItem] = []
        sector_totals: dict[str, float] = defaultdict(float)
        concentration_risk = False

        for h in enriched:
            market_val = h.market_value or (float(h.quantity) * float(h.average_price))
            alloc_pct = round((market_val / total_value) * 100, 2) if total_value > 0 else 0.0

            if alloc_pct > CONCENTRATION_THRESHOLD:
                concentration_risk = True

            inst = instruments.get(h.instrument_id)
            sector = inst.sector if inst else "Unknown"
            sector_totals[sector or "Unknown"] += market_val

            allocation_items.append(
                AllocationItem(
                    instrument_id=h.instrument_id,
                    symbol=h.symbol or "—",
                    name=h.name or "—",
                    sector=sector,
                    market_value=round(market_val, 2),
                    allocation_percent=alloc_pct,
                )
            )

        # Sector breakdown
        sector_breakdown = [
            SectorAllocation(
                sector=sector,
                total_value=round(value, 2),
                allocation_percent=round((value / total_value) * 100, 2) if total_value > 0 else 0.0,
            )
            for sector, value in sorted(sector_totals.items(), key=lambda x: x[1], reverse=True)
        ]

        return PortfolioAllocationResponse(
            portfolio_id=portfolio.id,
            total_value=round(total_value, 2),
            holdings=allocation_items,
            sector_breakdown=sector_breakdown,
            concentration_risk=concentration_risk,
        )
