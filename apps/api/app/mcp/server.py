"""
AutoPlot MCP Server — exposes market data, analytics, and ML predictions
as tools that AI agents can call.

Architecture:
  - Mounted on the existing FastAPI app via SSE transport
  - All data reads from the PostgreSQL database
  - Auto-ingests from Yahoo Finance when a symbol isn't in the DB yet
  - AI agents (Claude, custom agents) connect via http://localhost:8000/mcp/sse

Data Flow:
  Yahoo Finance API → Database → MCP Tools → AI Agent

MCP Concepts:
  Tools    → Functions the AI can call (get_stock_candles, get_prediction, etc.)
  Resources → Data the AI can read (market://RELIANCE/info)
  Prompts  → Pre-built analysis templates
"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Any

from mcp.server.fastmcp import FastMCP

from app.core.database import get_session_factory
from app.modules.instruments.repository import InstrumentRepository
from app.modules.market_data.repository import MarketDataRepository
from app.modules.market_data.service import MarketDataService

logger = logging.getLogger(__name__)

# Initialize the MCP server
mcp = FastMCP(
    "AutoPlot",
    instructions=(
        "AutoPlot is a stock trading analytics platform. "
        "Use the available tools to fetch real-time market data, "
        "compute technical indicators, and generate ML predictions "
        "for Indian (NSE) and US stocks. All data comes from the database, "
        "auto-ingested from Yahoo Finance."
    ),
)


# ================================================================
# DB SESSION HELPER — used by all MCP tools
# ================================================================

@asynccontextmanager
async def _db_session():
    """Create an async DB session for MCP tools."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ================================================================
# TOOL 1: Get Stock Candles (from DB, auto-ingests if missing)
# ================================================================

@mcp.tool()
async def get_stock_candles(
    symbol: str,
    interval: str = "1d",
    limit: int = 200,
) -> str:
    """
    Fetch OHLCV candle data for a stock from the database.
    Auto-ingests from Yahoo Finance if the symbol isn't in the DB yet.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE" for NSE, "AAPL" for US)
        interval: Candle interval - 1d, 1h, 15m, 5m, 1m, 1w
        limit: Maximum number of candles to return (default 200)

    Returns:
        JSON string with OHLCV candle data including dates, prices, and volume.

    Examples:
        get_stock_candles("RELIANCE")           → daily candles for Reliance (NSE)
        get_stock_candles("AAPL", "1d", 365)    → 1 year of Apple daily candles
        get_stock_candles("TCS", "1h", 100)     → 100 hourly TCS candles
    """
    async with _db_session() as session:
        service = MarketDataService(session)
        candles = await service.get_candles(
            symbol=symbol, interval=interval, limit=limit,
        )

        if not candles:
            return json.dumps({"error": f"No data found for {symbol}", "candles": []})

        candle_list = [
            {
                "date": c.candle_time.isoformat(),
                "open": round(float(c.open), 2),
                "high": round(float(c.high), 2),
                "low": round(float(c.low), 2),
                "close": round(float(c.close), 2),
                "volume": c.volume,
            }
            for c in candles
        ]

        return json.dumps({
            "symbol": symbol.upper(),
            "interval": interval,
            "candle_count": len(candle_list),
            "source": "database",
            "candles": candle_list,
        })


# ================================================================
# TOOL 2: Get Stock Quote (Latest Price)
# ================================================================

@mcp.tool()
async def get_stock_quote(symbol: str) -> str:
    """
    Get the latest real-time quote for a stock from Yahoo Finance.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE", "AAPL", "GOOGL")

    Returns:
        JSON with current price, change, volume, and other quote data.
    """
    async with _db_session() as session:
        service = MarketDataService(session)
        try:
            quote = await service.get_quote(symbol)
            return json.dumps({
                "symbol": symbol.upper(),
                "price": quote.price,
                "previous_close": quote.previous_close,
                "open": quote.open,
                "high": quote.high,
                "low": quote.low,
                "change": quote.change,
                "change_percent": quote.change_percent,
                "volume": quote.volume,
                "timestamp": quote.timestamp.isoformat(),
                "provider": quote.provider,
            })
        except Exception as e:
            return json.dumps({"error": f"Failed to get quote for {symbol}: {str(e)}"})


# ================================================================
# TOOL 3: Get Stock Info (from DB instruments table)
# ================================================================

@mcp.tool()
async def get_stock_info(symbol: str) -> str:
    """
    Get detailed company information for a stock from the database.
    Auto-ingests from Yahoo Finance if the instrument doesn't exist yet.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE", "AAPL")

    Returns:
        JSON with company name, sector, industry, description, key financials.
    """
    async with _db_session() as session:
        service = MarketDataService(session)
        try:
            # auto_ingest_symbol creates the instrument with full Yahoo info if it doesn't exist
            instrument = await service.auto_ingest_symbol(symbol)

            result = {
                "symbol": instrument.symbol,
                "name": instrument.name,
                "sector": instrument.sector or "N/A",
                "industry": instrument.industry or "N/A",
                "country": instrument.country or "N/A",
                "currency": instrument.currency,
                "description": instrument.description or "",
                "market_cap": instrument.market_cap,
                "pe_ratio": float(instrument.pe_ratio) if instrument.pe_ratio else None,
                "eps": float(instrument.eps) if instrument.eps else None,
                "dividend_yield": float(instrument.dividend_yield) if instrument.dividend_yield else None,
                "52_week_high": float(instrument.fifty_two_week_high) if instrument.fifty_two_week_high else None,
                "52_week_low": float(instrument.fifty_two_week_low) if instrument.fifty_two_week_low else None,
                "avg_volume": instrument.avg_volume,
                "website": instrument.website,
                "source": "database",
            }
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": f"Failed to get info for {symbol}: {str(e)}"})


# ================================================================
# TOOL 4: Search Stocks (from DB instruments table)
# ================================================================

@mcp.tool()
async def search_stocks(query: str) -> str:
    """
    Search for stocks by name or symbol from the database.

    Args:
        query: Search query (e.g., "Reliance", "tech", "banking")

    Returns:
        JSON list of matching stocks with their symbols and sectors.
    """
    async with _db_session() as session:
        instrument_repo = InstrumentRepository(session)
        instruments = await instrument_repo.search_instruments(
            query=query, limit=20,
        )

        results = [
            {
                "symbol": inst.symbol,
                "name": inst.name,
                "sector": inst.sector,
                "industry": inst.industry,
                "instrument_type": inst.instrument_type,
            }
            for inst in instruments
        ]

        return json.dumps({
            "query": query,
            "results": results,
            "count": len(results),
            "source": "database",
        })


# ================================================================
# TOOL 5: Compare Stocks (from DB)
# ================================================================

@mcp.tool()
async def compare_stocks(symbols: list[str], period_days: int = 30) -> str:
    """
    Compare multiple stocks side by side — returns key metrics for each.

    Args:
        symbols: List of stock symbols to compare (e.g., ["RELIANCE", "TCS", "INFY"])
        period_days: Number of recent days to compare (default 30)

    Returns:
        JSON with comparison data including returns, volatility, and volume for each stock.
    """
    comparisons: list[dict[str, Any]] = []

    async with _db_session() as session:
        service = MarketDataService(session)

        for symbol in symbols:
            try:
                candles = await service.get_candles(
                    symbol=symbol, interval="1d", limit=period_days + 50,
                )

                if not candles:
                    comparisons.append({"symbol": symbol.upper(), "error": "No data"})
                    continue

                # Use the most recent period_days candles
                recent = candles[-period_days:] if len(candles) > period_days else candles
                closes = [float(c.close) for c in recent]
                volumes = [c.volume for c in recent]
                highs = [float(c.high) for c in recent]
                lows = [float(c.low) for c in recent]

                if len(closes) >= 2:
                    returns = ((closes[-1] - closes[0]) / closes[0]) * 100
                else:
                    returns = 0.0

                # Simple volatility: std of daily returns
                if len(closes) > 1:
                    daily_rets = [
                        (closes[i] - closes[i - 1]) / closes[i - 1] * 100
                        for i in range(1, len(closes))
                    ]
                    avg_ret = sum(daily_rets) / len(daily_rets)
                    volatility = (sum((r - avg_ret) ** 2 for r in daily_rets) / len(daily_rets)) ** 0.5
                else:
                    volatility = 0.0

                comparisons.append({
                    "symbol": symbol.upper(),
                    "current_price": round(closes[-1], 2),
                    "period_return_pct": round(returns, 2),
                    "volatility_pct": round(volatility, 2),
                    "avg_volume": int(sum(volumes) / len(volumes)) if volumes else 0,
                    "high": round(max(highs), 2),
                    "low": round(min(lows), 2),
                    "data_points": len(closes),
                })
            except Exception as e:
                comparisons.append({"symbol": symbol.upper(), "error": str(e)})

    return json.dumps({
        "period_days": period_days,
        "stocks": comparisons,
        "source": "database",
    })


# ================================================================
# TOOL 6: Compute Technical Indicators (from DB candles)
# ================================================================

@mcp.tool()
async def get_technical_indicators(symbol: str) -> str:
    """
    Compute technical indicators for a stock using candle data from the database.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE", "AAPL")

    Returns:
        JSON with SMA(20), SMA(50), EMA(20), RSI(14), MACD, ATR(14) and their signals.
    """
    import numpy as np

    async with _db_session() as session:
        service = MarketDataService(session)
        candles = await service.get_candles(symbol=symbol, interval="1d", limit=200)

        if len(candles) < 50:
            return json.dumps({
                "error": f"Not enough data for {symbol}. Need 50+ days, got {len(candles)}."
            })

        closes = np.array([float(c.close) for c in candles])
        highs = np.array([float(c.high) for c in candles])
        lows = np.array([float(c.low) for c in candles])

        import pandas as pd
        close_series = pd.Series(closes)

        # SMA
        sma_20 = float(close_series.rolling(20).mean().iloc[-1])
        sma_50 = float(close_series.rolling(50).mean().iloc[-1])

        # EMA
        ema_20 = float(close_series.ewm(span=20, adjust=False).mean().iloc[-1])

        # RSI
        delta = close_series.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta).clip(lower=0).rolling(14).mean()
        rs = gain / loss
        rsi = float((100 - (100 / (1 + rs))).iloc[-1])

        # MACD
        ema_12 = close_series.ewm(span=12, adjust=False).mean()
        ema_26 = close_series.ewm(span=26, adjust=False).mean()
        macd_line = float((ema_12 - ema_26).iloc[-1])
        macd_signal = float((ema_12 - ema_26).ewm(span=9, adjust=False).mean().iloc[-1])

        # ATR
        high_series = pd.Series(highs)
        low_series = pd.Series(lows)
        tr1 = high_series - low_series
        tr2 = (high_series - close_series.shift(1)).abs()
        tr3 = (low_series - close_series.shift(1)).abs()
        tr = np.maximum(np.maximum(tr1, tr2), tr3)
        atr = float(pd.Series(tr).rolling(14).mean().iloc[-1])

        current = float(closes[-1])

        indicators = {
            "symbol": symbol.upper(),
            "current_price": round(current, 2),
            "data_points": len(candles),
            "source": "database",
            "indicators": {
                "SMA_20": {
                    "value": round(sma_20, 2),
                    "signal": "BULLISH" if current > sma_20 else "BEARISH",
                },
                "SMA_50": {
                    "value": round(sma_50, 2),
                    "signal": "BULLISH" if current > sma_50 else "BEARISH",
                },
                "EMA_20": {
                    "value": round(ema_20, 2),
                    "signal": "BULLISH" if current > ema_20 else "BEARISH",
                },
                "RSI_14": {
                    "value": round(rsi, 2),
                    "signal": "OVERBOUGHT" if rsi > 70 else "OVERSOLD" if rsi < 30 else "NEUTRAL",
                },
                "MACD": {
                    "value": round(macd_line, 4),
                    "signal_line": round(macd_signal, 4),
                    "signal": "BULLISH" if macd_line > macd_signal else "BEARISH",
                },
                "ATR_14": {
                    "value": round(atr, 2),
                    "atr_pct": round((atr / current) * 100, 2),
                },
            },
        }

        return json.dumps(indicators)


# ================================================================
# TOOL 7: ML Prediction (from DB candles + ML engine)
# ================================================================

@mcp.tool()
async def get_ml_prediction(symbol: str, horizon: int = 3) -> str:
    """
    Get ML-powered prediction for a stock using candle data from the database.
    Trains a GradientBoosting model on the stock's history and predicts direction.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE", "AAPL")
        horizon: Prediction horizon in days (1-10)

    Returns:
        JSON with predicted direction (UP/DOWN), confidence %, top signals,
        price target range, and human-readable explanation.
    """
    from app.modules.predictions.ml_engine import MLEngine

    async with _db_session() as session:
        service = MarketDataService(session)
        candles = await service.get_candles(symbol=symbol, interval="1d", limit=400)

        if len(candles) < 80:
            return json.dumps({
                "error": f"Not enough data for {symbol}. Need 80+ days, got {len(candles)}.",
            })

        closes = [float(c.close) for c in candles]
        highs = [float(c.high) for c in candles]
        lows = [float(c.low) for c in candles]
        volumes = [float(c.volume) for c in candles]

        result: dict[str, Any] = {
            "symbol": symbol.upper(),
            "horizon_days": horizon,
            "source": "database",
        }

        # Phase 1: Direction prediction
        direction = MLEngine.predict_direction(closes, highs, lows, volumes, horizon=horizon)
        if direction:
            result["direction"] = direction

        # Phase 2: Price target
        target = MLEngine.predict_price_target(closes, highs, lows, volumes, horizon=5)
        if target:
            result["price_target"] = target

        if not direction and not target:
            result["error"] = "Model training failed — insufficient clean data"

        return json.dumps(result, default=str)


# ================================================================
# RESOURCE: Stock Info
# ================================================================

@mcp.resource("market://{symbol}/info")
async def stock_info_resource(symbol: str) -> str:
    """Company information and key metrics for a stock."""
    return await get_stock_info(symbol)


@mcp.resource("market://{symbol}/quote")
async def stock_quote_resource(symbol: str) -> str:
    """Latest real-time quote for a stock."""
    return await get_stock_quote(symbol)


# ================================================================
# PROMPT: Stock Analysis
# ================================================================

@mcp.prompt()
def stock_analysis(symbol: str) -> str:
    """
    Generate a comprehensive stock analysis prompt.
    Uses real data from the database via the available tools.
    """
    return (
        f"Please analyze the stock {symbol.upper()} using the available tools. "
        f"Follow these steps:\n"
        f"1. First, get the stock info using get_stock_info('{symbol}')\n"
        f"2. Get the current quote using get_stock_quote('{symbol}')\n"
        f"3. Compute technical indicators using get_technical_indicators('{symbol}')\n"
        f"4. Get the ML prediction using get_ml_prediction('{symbol}')\n"
        f"5. Based on all the data, provide:\n"
        f"   - A summary of the stock's current position\n"
        f"   - Key technical signals (bullish/bearish)\n"
        f"   - The ML model's prediction and confidence\n"
        f"   - Risk factors to consider\n"
        f"   - A clear recommendation (BUY/HOLD/SELL) with reasoning\n"
    )


@mcp.prompt()
def compare_analysis(symbols: str) -> str:
    """
    Generate a comparative analysis prompt for multiple stocks.
    Pass symbols as comma-separated string (e.g., "RELIANCE,TCS,INFY").
    """
    symbol_list = [s.strip() for s in symbols.split(",")]
    return (
        f"Compare these stocks: {', '.join(symbol_list)}.\n"
        f"Use compare_stocks({symbol_list}) to get performance data, "
        f"then get_technical_indicators for each, and provide a ranked "
        f"recommendation based on momentum, value, and risk."
    )
