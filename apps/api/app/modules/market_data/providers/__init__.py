"""
Market data provider abstraction — base class defining the interface
that all market data providers must implement.

This allows swapping between mock, free, and paid data sources
without changing any business logic.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional

from app.modules.market_data.schemas import CandleData, QuoteResponse


class BaseMarketDataProvider(ABC):
    """Abstract base class for market data providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique identifier for this provider (e.g., 'mock', 'yahoo', 'polygon')."""
        ...

    @abstractmethod
    async def get_symbols(self) -> list[dict]:
        """
        Return available symbols from this provider.
        Each dict should have: symbol, name, exchange, instrument_type, sector, industry.
        """
        ...

    @abstractmethod
    async def get_candles(
        self,
        symbol: str,
        interval: str = "1d",
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 200,
    ) -> list[CandleData]:
        """
        Fetch OHLCV candle data for a symbol.
        Returns validated CandleData objects.
        """
        ...

    @abstractmethod
    async def get_quote(self, symbol: str) -> QuoteResponse:
        """
        Get the latest quote/price for a symbol.
        """
        ...
