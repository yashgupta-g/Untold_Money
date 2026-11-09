"""
Broker adapter registry.
"""

from __future__ import annotations

from typing import Optional

from app.modules.brokers.adapters.angelone import AngelOneAdapter
from app.modules.brokers.adapters.base import AppCredentials, BrokerAdapter, BrokerError
from app.modules.brokers.adapters.fyers import FyersAdapter

ADAPTERS: dict[str, type[BrokerAdapter]] = {
    AngelOneAdapter.name: AngelOneAdapter,
    FyersAdapter.name: FyersAdapter,
}


def get_adapter(broker: str, credentials: Optional[AppCredentials] = None) -> BrokerAdapter:
    try:
        cls = ADAPTERS[broker]
    except KeyError:
        raise BrokerError(f"Unsupported broker: {broker}")
    return cls(credentials=credentials)
