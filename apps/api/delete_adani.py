import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.core.config import get_settings
from app.modules.instruments.models import Instrument
from app.modules.market_data.models import MarketCandle

async def run():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session_factory() as session:
        result = await session.execute(select(Instrument).where(Instrument.symbol == 'ADANIENT'))
        instrument = result.scalar_one_or_none()
        
        if instrument:
            # Delete associated candles first
            await session.execute(MarketCandle.__table__.delete().where(MarketCandle.instrument_id == instrument.id))
            # Delete instrument
            await session.delete(instrument)
            await session.commit()
            print("Successfully deleted ADANIENT and its candles from the DB.")
        else:
            print("ADANIENT not found in the DB.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
