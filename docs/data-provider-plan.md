# Data Provider Plan

## Strategy
Use a **provider abstraction layer** so the platform can switch between data sources without changing business logic.

## Architecture
```python
class MarketDataProvider(Protocol):
    async def fetch_candles(self, symbol: str, interval: str, start: datetime, end: datetime) -> list[Candle]: ...
    async def fetch_quote(self, symbol: str) -> Quote: ...
    async def search_instruments(self, query: str) -> list[Instrument]: ...
```

## Provider Priority

### Phase 1 (MVP)
- **Manual CSV import** — Users upload historical data
- **Yahoo Finance (yfinance)** — Free, unofficial, good for development
- Note: Not suitable for production due to rate limits and TOS

### Phase 2 (Beta)
- **Alpha Vantage** — Free tier (5 calls/min, 500/day)
- **Twelve Data** — Good free tier, technical indicators included

### Phase 3 (Production)
- **Polygon.io** — Reliable, good pricing, US markets
- **NSE data feed** — Direct exchange data (licensing required)
- **BSE data feed** — Bombay Stock Exchange data

### Phase 4 (Scale)
- **Bloomberg Terminal API** — Enterprise grade
- **Refinitiv** — Comprehensive global data
- Multiple providers with fallback chain

## Licensing Considerations
- Yahoo Finance: unofficial API, not for commercial redistribution
- NSE/BSE: requires data vendor agreement for redistribution
- Polygon/Alpha Vantage: commercial licenses available
- Store raw data, compute derived data in-house

## Data Normalization
All providers must map to our internal `MarketCandle` schema:
- Timestamps normalized to UTC
- Prices as Decimal(18,4)
- Volume as BigInteger
- Provider field tracked for data lineage
