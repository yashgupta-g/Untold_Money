"""
Market data service — business logic for candles, quotes, and ingestion.

Uses Yahoo Finance as the real data provider. The mock provider has been removed.
All data flows through: Yahoo Finance API → Database → Service consumers.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.modules.audit.service import AuditService
from app.modules.instruments.models import Exchange, Instrument
from app.modules.instruments.repository import InstrumentRepository
from app.modules.market_data.models import DataIngestionRun, MarketCandle
from app.modules.market_data.providers import BaseMarketDataProvider
from app.modules.market_data.providers.yahoo_provider import YahooFinanceProvider
from app.modules.market_data.repository import MarketDataRepository
from app.modules.market_data.schemas import (
    CandleResponse,
    IngestionRunResponse,
    QuoteResponse,
)

logger = get_logger(__name__)


def get_provider(provider_name: str = "yahoo") -> BaseMarketDataProvider:
    """Factory function — returns the appropriate provider instance."""
    providers: dict[str, type[BaseMarketDataProvider]] = {
        "yahoo": YahooFinanceProvider,
    }
    provider_cls = providers.get(provider_name)
    if not provider_cls:
        raise ValueError(f"Unknown provider: {provider_name}. Available: {list(providers.keys())}")
    return provider_cls()


class MarketDataService:
    """Business logic for market data operations."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = MarketDataRepository(session)
        self.instrument_repo = InstrumentRepository(session)
        self.audit = AuditService(session)

    # ================================================================
    # AUTO-INGESTION — ensures instrument + candle data exist in DB
    # ================================================================

    async def auto_ingest_symbol(
        self,
        symbol: str,
        interval: str = "1d",
        days: int = 365,
    ) -> Instrument:
        """
        Ensure a symbol exists in the DB with candle data.
        If the instrument doesn't exist, creates it from Yahoo Finance data
        (including company info). If candle data is missing, ingests it.

        Returns the Instrument ORM object.
        """
        provider = YahooFinanceProvider()
        upper_symbol = symbol.upper()

        # 1. Check if instrument exists
        instrument = await self.instrument_repo.get_instrument_by_symbol(upper_symbol)

        if not instrument:
            logger.info("auto_ingest_creating_instrument", symbol=upper_symbol)

            # Ensure NSE exchange exists
            exchange = await self.instrument_repo.get_exchange_by_code("NSE")
            if not exchange:
                exchange = Exchange(code="NSE", name="National Stock Exchange", country="IN")
                exchange = await self.instrument_repo.create_exchange(exchange)

            # Fetch company info from Yahoo Finance
            stock_info = provider.get_stock_info(upper_symbol)

            instrument = Instrument(
                exchange_id=exchange.id,
                symbol=upper_symbol,
                name=stock_info.get("name", upper_symbol),
                instrument_type="EQUITY",
                sector=stock_info.get("sector"),
                industry=stock_info.get("industry"),
                currency=stock_info.get("currency", "INR"),
                description=stock_info.get("description"),
                country=stock_info.get("country"),
                website=stock_info.get("website"),
                market_cap=stock_info.get("market_cap"),
                pe_ratio=stock_info.get("pe_ratio"),
                eps=stock_info.get("eps"),
                dividend_yield=stock_info.get("dividend_yield"),
                fifty_two_week_high=stock_info.get("fifty_two_week_high"),
                fifty_two_week_low=stock_info.get("fifty_two_week_low"),
                avg_volume=stock_info.get("avg_volume"),
                info_updated_at=datetime.now(timezone.utc),
            )
            instrument = await self.instrument_repo.create_instrument(instrument)
            await self.session.flush()

        # 2. Check if we have candle data
        existing_candles = await self.repo.get_candles(
            instrument_id=instrument.id, interval=interval, limit=1,
        )

        if not existing_candles:
            logger.info("auto_ingest_fetching_candles", symbol=upper_symbol, days=days)

            end = datetime.now(timezone.utc)
            from datetime import timedelta
            start = end - timedelta(days=days)

            raw_candles = await provider.get_candles(
                symbol=upper_symbol,
                interval=interval,
                start=start,
                end=end,
                limit=days + 100,
            )

            if raw_candles:
                db_candles = [
                    MarketCandle(
                        instrument_id=instrument.id,
                        candle_time=c.candle_time,
                        interval=interval,
                        open=c.open,
                        high=c.high,
                        low=c.low,
                        close=c.close,
                        volume=c.volume,
                        provider=provider.provider_name,
                    )
                    for c in raw_candles
                ]
                await self.repo.add_candles(db_candles)
                await self.session.flush()
                logger.info(
                    "auto_ingest_complete",
                    symbol=upper_symbol,
                    candles=len(db_candles),
                )

        return instrument

    # ================================================================
    # READ — get candles and quotes from DB
    # ================================================================

    async def get_candles(
        self,
        symbol: str,
        interval: str = "1d",
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 200,
    ) -> list[CandleResponse]:
        """
        Get candles from DB for a symbol.
        Auto-ingests from Yahoo Finance if no data exists.
        """
        instrument = await self.auto_ingest_symbol(symbol, interval=interval)

        candles = await self.repo.get_candles(
            instrument_id=instrument.id,
            interval=interval,
            start=start,
            end=end,
            limit=limit,
        )

        return [
            CandleResponse(
                instrument_id=c.instrument_id,
                symbol=instrument.symbol,
                candle_time=c.candle_time,
                interval=c.interval,
                open=float(c.open),
                high=float(c.high),
                low=float(c.low),
                close=float(c.close),
                volume=c.volume,
                provider=c.provider,
            )
            for c in candles
        ]

    async def get_quote(self, symbol: str) -> QuoteResponse:
        """Get latest quote for a symbol via Yahoo Finance provider."""
        provider = get_provider("yahoo")
        return await provider.get_quote(symbol.upper())

    # ================================================================
    # BULK INGESTION — ingest data for multiple symbols
    # ================================================================

    async def ingest_data(
        self,
        symbols: Optional[list[str]] = None,
        interval: str = "1d",
        days: int = 365,
        actor_user_id: Optional[uuid.UUID] = None,
    ) -> IngestionRunResponse:
        """
        Ingest real market data from Yahoo Finance into the database.
        Creates instruments if they don't exist, then fetches and stores candles.
        """
        provider = get_provider("yahoo")

        # Create ingestion run record
        run = DataIngestionRun(
            provider=provider.provider_name,
            status="running",
        )
        run = await self.repo.create_ingestion_run(run)

        try:
            # Determine which symbols to ingest
            if symbols:
                symbol_list = [s.upper() for s in symbols]
            else:
                available_symbols = await provider.get_symbols()
                symbol_list = [s["symbol"] for s in available_symbols]

            total_candles = 0
            symbol_count = 0

            for sym in symbol_list:
                try:
                    instrument = await self.auto_ingest_symbol(
                        sym, interval=interval, days=days,
                    )

                    # Count candles for this symbol
                    candles = await self.repo.get_candles(
                        instrument_id=instrument.id, interval=interval, limit=1000,
                    )
                    total_candles += len(candles)
                    symbol_count += 1

                    logger.info(
                        "ingestion_symbol_done",
                        symbol=sym,
                        candles=len(candles),
                    )
                except Exception as e:
                    logger.warning(
                        "ingestion_symbol_failed",
                        symbol=sym,
                        error=str(e),
                    )
                    continue

            # Mark run as complete
            run.status = "completed"
            run.symbol_count = symbol_count
            run.candle_count = total_candles
            run.completed_at = datetime.now(timezone.utc)
            run = await self.repo.update_ingestion_run(run)

            await self.audit.log_event(
                action="INGEST_MARKET_DATA",
                entity_type="DATA_INGESTION_RUN",
                entity_id=str(run.id),
                actor_user_id=actor_user_id,
                details=f"Ingested Yahoo Finance data for {symbol_count} symbols ({total_candles} candles)",
                metadata={
                    "symbols": symbols,
                    "interval": interval,
                    "days": days,
                    "candle_count": total_candles,
                },
            )

            return IngestionRunResponse.model_validate(run)

        except Exception as e:
            run.status = "failed"
            run.error_message = str(e)
            run.completed_at = datetime.now(timezone.utc)
            await self.repo.update_ingestion_run(run)
            logger.error("ingestion_failed", error=str(e), run_id=str(run.id))
            raise

    # ================================================================
    # REFRESH — update company info for an instrument
    # ================================================================

    async def refresh_instrument_info(self, symbol: str) -> Instrument:
        """
        Refresh company info (market_cap, PE, etc.) for an instrument
        by re-fetching from Yahoo Finance.
        """
        instrument = await self.instrument_repo.get_instrument_by_symbol(symbol.upper())
        if not instrument:
            raise NotFoundException(f"Instrument '{symbol}' not found")

        provider = YahooFinanceProvider()
        stock_info = provider.get_stock_info(symbol)

        if stock_info:
            instrument.name = stock_info.get("name", instrument.name)
            instrument.sector = stock_info.get("sector") or instrument.sector
            instrument.industry = stock_info.get("industry") or instrument.industry
            instrument.description = stock_info.get("description")
            instrument.country = stock_info.get("country")
            instrument.website = stock_info.get("website")
            instrument.market_cap = stock_info.get("market_cap")
            instrument.pe_ratio = stock_info.get("pe_ratio")
            instrument.eps = stock_info.get("eps")
            instrument.dividend_yield = stock_info.get("dividend_yield")
            instrument.fifty_two_week_high = stock_info.get("fifty_two_week_high")
            instrument.fifty_two_week_low = stock_info.get("fifty_two_week_low")
            instrument.avg_volume = stock_info.get("avg_volume")
            instrument.info_updated_at = datetime.now(timezone.utc)
            await self.session.flush()

        return instrument
