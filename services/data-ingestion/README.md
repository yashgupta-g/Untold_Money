# Data Ingestion Service

Future microservice for market data ingestion from multiple providers.

## Responsibilities
- Fetch OHLCV data from data providers (Yahoo Finance, Alpha Vantage, Polygon, etc.)
- Sync instrument master lists from exchanges
- Normalize data across providers
- Bulk import historical data

## Current Status
Placeholder — logic currently lives in `apps/api/app/workers/data_jobs.py`.
Will be extracted into a standalone service when scaling requires it.
