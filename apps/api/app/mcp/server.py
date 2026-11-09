"""
UntoldMoney MCP server — reference data for AI agents.

Mounted on the FastAPI app via SSE (see main.py; requires MCP_API_KEY outside
local development).

Only reference data is exposed: the NSE instrument list (from Fyers's public
symbol master). Prices, candles, indicators and predictions are not: market
data comes only from each user's own broker connection, and an MCP client
has no user, so serving it here would redistribute exchange data.
"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from mcp.server.fastmcp import FastMCP

from app.core.database import get_session_factory
from app.modules.instruments.master import ensure_instrument
from app.modules.instruments.repository import InstrumentRepository

logger = logging.getLogger(__name__)

mcp = FastMCP(
    "UntoldMoney",
    instructions=(
        "UntoldMoney is a trading workspace for Indian (NSE) stocks. These tools "
        "look up NSE instruments. Live prices and analysis are available only "
        "inside the app, through each user's own broker connection."
    ),
)


@asynccontextmanager
async def _db_session():
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def _instrument_json(inst) -> dict:
    return {
        "symbol": inst.symbol,
        "name": inst.name,
        "instrument_type": inst.instrument_type,
        "isin": inst.isin,
        "sector": inst.sector,
        "industry": inst.industry,
        "currency": inst.currency,
    }


@mcp.tool()
async def get_stock_info(symbol: str) -> str:
    """
    Reference details for an NSE stock or index.

    Args:
        symbol: NSE symbol, e.g. "RELIANCE" or "NIFTY50".
    """
    async with _db_session() as session:
        instrument = await ensure_instrument(session, symbol)
        if not instrument:
            return json.dumps({"error": f"'{symbol.upper()}' isn't listed on NSE"})
        return json.dumps(_instrument_json(instrument))


@mcp.tool()
async def search_stocks(query: str) -> str:
    """
    Search NSE stocks by name or symbol.

    Args:
        query: e.g. "Reliance", "bank", "TCS".
    """
    async with _db_session() as session:
        instruments = await InstrumentRepository(session).search_instruments(query=query, limit=20)
        results = [_instrument_json(i) for i in instruments]
        return json.dumps({"query": query, "results": results, "count": len(results)})


@mcp.resource("market://{symbol}/info")
async def stock_info_resource(symbol: str) -> str:
    """Reference details for an NSE stock or index."""
    return await get_stock_info(symbol)
