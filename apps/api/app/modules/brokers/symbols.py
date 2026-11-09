"""
Broker symbols → UntoldMoney instrument symbols.

Brokers name equities like "RELIANCE-EQ" (Angel One) or "NSE:RELIANCE-EQ"
(Fyers); instruments here use the bare NSE symbol, "RELIANCE". Only cash
equities map for now: derivatives and other series return None and are
reported as unmapped.
"""

from __future__ import annotations

import re
from typing import Optional

# Equity series that trade as ordinary shares.
_EQUITY_SERIES = ("-EQ", "-BE", "-BZ", "-SM", "-ST")

# Derivative contracts carry an expiry and end in FUT, or a strike + CE/PE:
# NIFTY24NOVFUT, BANKNIFTY24N2848000CE, RELIANCE24DEC3000PE.
_DERIVATIVE = re.compile(
    r"\d{2}(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)|FUT$|\d(CE|PE)$"
)
_PLAIN = re.compile(r"^[A-Z0-9&][A-Z0-9&\-]*$")  # e.g. M&M, BAJAJ-AUTO


def to_instrument_symbol(broker_symbol: str) -> Optional[str]:
    symbol = broker_symbol.strip().upper()
    if ":" in symbol:
        _, symbol = symbol.split(":", 1)
    for series in _EQUITY_SERIES:
        if symbol.endswith(series):
            symbol = symbol[: -len(series)]
            break
    if not symbol or not _PLAIN.match(symbol) or _DERIVATIVE.search(symbol):
        return None
    return symbol


# ------------------------------------------------------------------ Fyers

# Index symbols as Fyers names them (instruments here are equities today).
_FYERS_INDICES = {
    "NIFTY50": "NSE:NIFTY50-INDEX",
    "NIFTY": "NSE:NIFTY50-INDEX",
    "BANKNIFTY": "NSE:NIFTYBANK-INDEX",
    "NIFTYBANK": "NSE:NIFTYBANK-INDEX",
    "FINNIFTY": "NSE:FINNIFTY-INDEX",
    "SENSEX": "BSE:SENSEX-INDEX",
}


def to_fyers_symbol(symbol: str, exchange: str = "NSE", instrument_type: str = "EQUITY") -> Optional[str]:
    """UntoldMoney symbol → Fyers symbol: "RELIANCE" → "NSE:RELIANCE-EQ"."""
    symbol = symbol.strip().upper()
    if symbol in _FYERS_INDICES:
        return _FYERS_INDICES[symbol]
    exchange = (exchange or "NSE").strip().upper()
    if not symbol or not _PLAIN.match(symbol) or exchange not in ("NSE", "BSE"):
        return None
    if instrument_type == "INDEX":  # stored under the Fyers name, e.g. "NIFTYIT"
        return f"{exchange}:{symbol}-INDEX"
    return f"{exchange}:{symbol}-EQ"


def from_fyers_symbol(fyers_symbol: str) -> Optional[str]:
    """The reverse, for indices too: "NSE:NIFTYBANK-INDEX" → "BANKNIFTY"."""
    for ours, theirs in _FYERS_INDICES.items():
        if theirs == fyers_symbol and ours not in ("NIFTY", "NIFTYBANK"):
            return ours
    return to_instrument_symbol(fyers_symbol)


# UntoldMoney interval → Fyers resolution. "1w" is built from daily candles.
FYERS_RESOLUTION = {"1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D"}
