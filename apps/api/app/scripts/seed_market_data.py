"""
Seed script — populates the database with real market data from Yahoo Finance.

Usage:
    cd apps/api
    .venv/bin/python -m app.scripts.seed_market_data

This script:
  1. Creates an NSE exchange if it doesn't exist
  2. Creates instruments for all NSE stocks (with company info from Yahoo Finance)
  3. Fetches 1 year of real daily candle data for each stock
  4. Stores everything in the market_candles table

After running this, indicators, scores, and ML predictions will all work
with real market data.
"""

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.modules.market_data.providers.yahoo_provider import YahooFinanceProvider, NSE_INSTRUMENTS
from app.modules.market_data.repository import MarketDataRepository
from app.modules.market_data.service import MarketDataService


async def seed():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session_factory() as session:
        service = MarketDataService(session)

        print("🚀 Starting Yahoo Finance data ingestion...")
        print(f"📊 Ingesting data for {len(NSE_INSTRUMENTS)} NSE stocks\n")

        total_ingested = 0

        for sym_data in NSE_INSTRUMENTS:
            symbol = sym_data["symbol"]
            try:
                instrument = await service.auto_ingest_symbol(
                    symbol, interval="1d", days=365,
                )
                await session.commit()

                # Count candles
                repo = MarketDataRepository(session)
                candles = await repo.get_candles(
                    instrument_id=instrument.id, interval="1d", limit=1000,
                )
                total_ingested += len(candles)
                print(f"  ✅ {symbol}: {len(candles)} candles ({instrument.name})")

            except Exception as e:
                await session.rollback()
                print(f"  ❌ {symbol}: Failed — {e}")
                continue

        print(f"\n🎉 Done! Total candles ingested: {total_ingested}")
        print("📊 You can now view indicators, scores, and ML predictions for all stocks.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
