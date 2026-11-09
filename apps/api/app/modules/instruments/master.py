"""
The list of tradable NSE stocks and indices, from Fyers's public symbol master.

https://public.fyers.in/sym_details/NSE_CM.csv is published daily, needs no
login, and carries reference data only (symbol, name, ISIN, tick size), not
prices. Rows look like:

    10100000002885,RELIANCE INDUSTRIES LTD,0,1,0.1,INE002A01018,0915-1530|…,
    2026-11-08,,NSE:RELIANCE-EQ,10,10,2885,RELIANCE,2885,…

Column 9 is the Fyers ticker and column 13 the exchange symbol. We keep the
EQ series and the indices; indices use the Fyers name ("NIFTY50",
"NIFTYBANK") as their symbol, so `to_fyers_symbol` can map them back.

The master is fetched at most every few hours per process, and synced into
the `instruments` table by a weekly job (and on first start).
"""

from __future__ import annotations

import csv
import io
import time
from dataclasses import dataclass
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.modules.instruments.models import Exchange, Instrument

logger = get_logger(__name__)

MASTER_URL = "https://public.fyers.in/sym_details/NSE_CM.csv"
CACHE_SECONDS = 6 * 3600


@dataclass(frozen=True)
class MasterRow:
    symbol: str
    name: str
    instrument_type: str  # EQUITY | INDEX
    isin: Optional[str]


_cache: tuple[float, dict[str, MasterRow]] | None = None


def parse_master(text: str) -> dict[str, MasterRow]:
    rows: dict[str, MasterRow] = {}
    for cols in csv.reader(io.StringIO(text)):
        if len(cols) < 14:
            continue
        ticker = cols[9].strip()
        if not ticker.startswith("NSE:"):
            continue
        bare = ticker[4:]
        if bare.endswith("-EQ"):
            symbol, kind = bare[:-3], "EQUITY"
        elif bare.endswith("-INDEX"):
            symbol, kind = bare[:-6], "INDEX"
        else:
            continue
        name = cols[1].strip() or symbol
        rows[symbol.upper()] = MasterRow(
            symbol=symbol.upper(),
            name=name[:255],
            instrument_type=kind,
            isin=(cols[5].strip() or None) if kind == "EQUITY" else None,
        )
    return rows


async def load_master(force: bool = False) -> dict[str, MasterRow]:
    global _cache
    if not force and _cache and time.monotonic() - _cache[0] < CACHE_SECONDS:
        return _cache[1]
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(MASTER_URL)
        response.raise_for_status()
    rows = parse_master(response.text)
    if not rows:
        raise RuntimeError("Fyers symbol master was empty")
    _cache = (time.monotonic(), rows)
    return rows


async def _nse(session: AsyncSession) -> Exchange:
    exchange = await session.scalar(select(Exchange).where(Exchange.code == "NSE"))
    if not exchange:
        exchange = Exchange(code="NSE", name="National Stock Exchange", country="IN")
        session.add(exchange)
        await session.flush()
    return exchange


async def sync_instruments(session: AsyncSession, rows: Optional[dict[str, MasterRow]] = None) -> int:
    """Add stocks and indices that aren't in the table yet. Returns how many were added."""
    rows = rows if rows is not None else await load_master()
    exchange = await _nse(session)
    existing = set(
        (await session.execute(select(Instrument.symbol).where(Instrument.exchange_id == exchange.id))).scalars()
    )
    added = 0
    for row in rows.values():
        if row.symbol in existing:
            continue
        session.add(
            Instrument(
                exchange_id=exchange.id,
                symbol=row.symbol,
                name=row.name,
                instrument_type=row.instrument_type,
                isin=row.isin,
                currency="INR",
            )
        )
        added += 1
    await session.flush()
    logger.info("instruments_synced", added=added, total=len(rows))
    return added


async def ensure_instrument(session: AsyncSession, symbol: str) -> Optional[Instrument]:
    """The instrument for `symbol`, created from the symbol master if it's new."""
    symbol = symbol.strip().upper()
    instrument = await session.scalar(select(Instrument).where(Instrument.symbol == symbol))
    if instrument:
        return instrument
    try:
        row = (await load_master()).get(symbol)
    except Exception as exc:  # master unreachable: treat as unknown
        logger.warning("symbol_master_unavailable", error=str(exc))
        return None
    if not row:
        return None
    exchange = await _nse(session)
    instrument = Instrument(
        exchange_id=exchange.id,
        symbol=row.symbol,
        name=row.name,
        instrument_type=row.instrument_type,
        isin=row.isin,
        currency="INR",
    )
    session.add(instrument)
    await session.flush()
    return instrument
