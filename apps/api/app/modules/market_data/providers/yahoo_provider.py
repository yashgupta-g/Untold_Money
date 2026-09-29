"""
Yahoo Finance market data provider — fetches real OHLCV data
and company info from Yahoo Finance via the yfinance library.

Replaces the mock provider for production use.
No API key required (uses Yahoo's public API via yfinance).
"""

from __future__ import annotations


from datetime import datetime, timezone
from typing import Any, Optional

import yfinance as yf

from app.core.logging import get_logger
from app.modules.market_data.providers import BaseMarketDataProvider
from app.modules.market_data.schemas import CandleData, QuoteResponse

logger = get_logger(__name__)

# ================================================================
# NSE Symbol Mapping — Yahoo Finance requires .NS suffix
# ================================================================

NSE_SYMBOL_MAP: dict[str, str] = {
    "RELIANCE": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "HDFCBANK": "HDFCBANK.NS",
    "INFY": "INFY.NS",
    "ICICIBANK": "ICICIBANK.NS",
    "HINDUNILVR": "HINDUNILVR.NS",
    "SBIN": "SBIN.NS",
    "BHARTIARTL": "BHARTIARTL.NS",
    "ITC": "ITC.NS",
    "KOTAKBANK": "KOTAKBANK.NS",
    "LT": "LT.NS",
    "AXISBANK": "AXISBANK.NS",
    "TATAMOTORS": "TATAMOTORS.NS",
    "WIPRO": "WIPRO.NS",
    "SUNPHARMA": "SUNPHARMA.NS",
    "BAJFINANCE": "BAJFINANCE.NS",
    "MARUTI": "MARUTI.NS",
    "HCLTECH": "HCLTECH.NS",
    "ADANIENT": "ADANIENT.NS",
    "TITAN": "TITAN.NS",
}

# Default NSE stock universe for bulk ingestion
NSE_INSTRUMENTS = [
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "sector": "Energy", "industry": "Oil & Gas Refining"},
    {"symbol": "TCS", "name": "Tata Consultancy Services Ltd", "sector": "Technology", "industry": "IT Services"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "sector": "Financial Services", "industry": "Banking"},
    {"symbol": "INFY", "name": "Infosys Ltd", "sector": "Technology", "industry": "IT Services"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "sector": "Financial Services", "industry": "Banking"},
    {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd", "sector": "FMCG", "industry": "Consumer Goods"},
    {"symbol": "SBIN", "name": "State Bank of India", "sector": "Financial Services", "industry": "Banking"},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "sector": "Telecom", "industry": "Telecom Services"},
    {"symbol": "ITC", "name": "ITC Ltd", "sector": "FMCG", "industry": "Tobacco & FMCG"},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd", "sector": "Financial Services", "industry": "Banking"},
    {"symbol": "LT", "name": "Larsen & Toubro Ltd", "sector": "Industrials", "industry": "Engineering & Construction"},
    {"symbol": "AXISBANK", "name": "Axis Bank Ltd", "sector": "Financial Services", "industry": "Banking"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd", "sector": "Automobile", "industry": "Auto Manufacturers"},
    {"symbol": "WIPRO", "name": "Wipro Ltd", "sector": "Technology", "industry": "IT Services"},
    {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical Industries Ltd", "sector": "Healthcare", "industry": "Pharmaceuticals"},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd", "sector": "Financial Services", "industry": "NBFC"},
    {"symbol": "MARUTI", "name": "Maruti Suzuki India Ltd", "sector": "Automobile", "industry": "Auto Manufacturers"},
    {"symbol": "HCLTECH", "name": "HCL Technologies Ltd", "sector": "Technology", "industry": "IT Services"},
    {"symbol": "ADANIENT", "name": "Adani Enterprises Ltd", "sector": "Industrials", "industry": "Conglomerate"},
    {"symbol": "TITAN", "name": "Titan Company Ltd", "sector": "Consumer Goods", "industry": "Jewellery & Watches"},
]


class YahooFinanceProvider(BaseMarketDataProvider):
    """
    Real market data provider using Yahoo Finance.

    Fetches actual OHLCV data and company info for Indian (NSE) and US stocks.
    Free tier — no API key required. Rate-limited by Yahoo.
    """

    @property
    def provider_name(self) -> str:
        return "yahoo"

    def resolve_yf_symbol(self, symbol: str) -> str:
        """Convert our internal symbol to Yahoo Finance format."""
        upper = symbol.upper()
        if upper in NSE_SYMBOL_MAP:
            return NSE_SYMBOL_MAP[upper]
        if upper.endswith((".NS", ".BO")):
            return upper
        # US stock — no suffix needed
        return upper

    async def get_symbols(self) -> list[dict]:
        """Return the default NSE stock universe."""
        return [
            {
                "symbol": s["symbol"],
                "name": s["name"],
                "exchange": "NSE",
                "instrument_type": "EQUITY",
                "sector": s.get("sector"),
                "industry": s.get("industry"),
            }
            for s in NSE_INSTRUMENTS
        ]

    async def get_candles(
        self,
        symbol: str,
        interval: str = "1d",
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 200,
    ) -> list[CandleData]:
        """Fetch real OHLCV candle data from Yahoo Finance."""
        yf_symbol = self.resolve_yf_symbol(symbol)
        ticker = yf.Ticker(yf_symbol)

        # Map our interval format to yfinance
        yf_interval_map = {
            "1m": "1m", "5m": "5m", "15m": "15m",
            "1h": "1h", "4h": "1h",
            "1d": "1d", "1w": "1wk",
        }
        yf_interval = yf_interval_map.get(interval, "1d")

        try:
            if start and end:
                df = ticker.history(start=start, end=end, interval=yf_interval)
            elif start:
                df = ticker.history(start=start, interval=yf_interval)
            else:
                # Compute a reasonable period from the limit
                period_map = {
                    "1m": "7d", "5m": "60d", "15m": "60d",
                    "1h": "730d", "4h": "730d",
                    "1d": f"{min(limit + 50, 730)}d",
                    "1w": f"{min(limit * 7 + 50, 3650)}d",
                }
                period = period_map.get(interval, f"{limit}d")
                df = ticker.history(period=period, interval=yf_interval)
        except Exception as e:
            logger.error("yahoo_fetch_error", symbol=symbol, error=str(e))
            return []

        if df.empty:
            logger.warning("yahoo_no_data", symbol=symbol, yf_symbol=yf_symbol)
            return []

        candles: list[CandleData] = []
        for idx, row in df.iterrows():
            try:
                o = round(float(row["Open"]), 4)
                h = round(float(row["High"]), 4)
                low_val = round(float(row["Low"]), 4)
                c = round(float(row["Close"]), 4)
                v = int(row["Volume"])

                # Ensure OHLC constraints
                h = max(h, o, c)
                low_val = min(low_val, o, c)

                candle_time = idx.to_pydatetime()
                if candle_time.tzinfo is None:
                    candle_time = candle_time.replace(tzinfo=timezone.utc)

                candles.append(CandleData(
                    candle_time=candle_time,
                    open=o,
                    high=h,
                    low=low_val,
                    close=c,
                    volume=v,
                ))
            except (ValueError, KeyError) as e:
                logger.debug("yahoo_candle_skip", idx=str(idx), error=str(e))
                continue

        # Respect limit
        if len(candles) > limit:
            candles = candles[-limit:]

        logger.info("yahoo_candles_fetched", symbol=symbol, count=len(candles))
        return candles

    async def get_quote(self, symbol: str) -> QuoteResponse:
        """Get latest real-time quote from Yahoo Finance."""
        yf_symbol = self.resolve_yf_symbol(symbol)
        ticker = yf.Ticker(yf_symbol)
        info = ticker.fast_info

        price = round(float(info.last_price), 2) if info.last_price else 0.0
        prev_close = round(float(info.previous_close), 2) if info.previous_close else 0.0
        change = round(price - prev_close, 2) if price and prev_close else 0.0
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0.0

        return QuoteResponse(
            symbol=symbol.upper(),
            price=price,
            change=change,
            change_percent=change_pct,
            high=round(float(info.day_high), 2) if info.day_high else price,
            low=round(float(info.day_low), 2) if info.day_low else price,
            open=round(float(info.open), 2) if info.open else price,
            previous_close=prev_close,
            volume=int(info.last_volume) if info.last_volume else 0,
            timestamp=datetime.now(timezone.utc),
            provider=self.provider_name,
        )

    # ================================================================
    # Yahoo-specific: Company info (not in BaseMarketDataProvider)
    # ================================================================

    def get_stock_info(self, symbol: str) -> dict[str, Any]:
        """
        Fetch detailed company information from Yahoo Finance.

        Used during instrument ingestion to populate company info fields
        in the instruments table. NOT part of the base provider interface.
        """
        yf_symbol = self.resolve_yf_symbol(symbol)
        ticker = yf.Ticker(yf_symbol)

        try:
            info = ticker.info
        except Exception as e:
            logger.warning("yahoo_info_failed", symbol=symbol, error=str(e))
            return {}

        return {
            "name": info.get("longName") or info.get("shortName", symbol.upper()),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "country": info.get("country"),
            "currency": info.get("currency", "INR"),
            "description": (info.get("longBusinessSummary") or "")[:2000],
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "eps": info.get("trailingEps"),
            "dividend_yield": info.get("dividendYield"),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
            "avg_volume": info.get("averageVolume"),
            "website": info.get("website"),
        }
