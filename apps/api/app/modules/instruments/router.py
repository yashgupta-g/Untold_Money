"""
Instrument router — public and admin endpoints for instruments and exchanges.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Query

from app.core.dependencies import AsyncSessionDep, CurrentUserIdDep
from app.modules.instruments.schemas import (
    ExchangeCreateRequest,
    InstrumentCreateRequest,
    InstrumentUpdateRequest,
)
from app.modules.instruments.service import InstrumentService

# --- Public routes ---
router = APIRouter(prefix="/instruments", tags=["Instruments"])


@router.get("", summary="List or filter instruments")
async def list_instruments(
    session: AsyncSessionDep,
    q: str = Query(default="", max_length=100, description="Search by symbol or name"),
    exchange_code: str = Query(default=None, description="Filter by exchange code"),
    instrument_type: str = Query(default=None, description="Filter by type (EQUITY, ETF, etc.)"),
    is_active: bool = Query(default=True),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict:
    service = InstrumentService(session)
    instruments = await service.list_instruments(
        query=q,
        exchange_code=exchange_code,
        instrument_type=instrument_type,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    return {
        "success": True,
        "message": "Instruments retrieved",
        "data": [i.model_dump(mode="json") for i in instruments],
    }


@router.get("/search", summary="Quick search instruments")
async def search_instruments(
    session: AsyncSessionDep,
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(default=20, ge=1, le=50),
) -> dict:
    service = InstrumentService(session)
    results = await service.search_instruments(q=q, limit=limit)
    return {
        "success": True,
        "message": "Search results",
        "data": [r.model_dump(mode="json") for r in results],
    }


@router.get("/exchanges", summary="List all exchanges")
async def list_exchanges(session: AsyncSessionDep) -> dict:
    service = InstrumentService(session)
    exchanges = await service.list_exchanges()
    return {
        "success": True,
        "message": "Exchanges retrieved",
        "data": [e.model_dump(mode="json") for e in exchanges],
    }


@router.get("/{symbol}", summary="Get instrument by symbol")
async def get_instrument_by_symbol(
    symbol: str,
    session: AsyncSessionDep,
) -> dict:
    service = InstrumentService(session)
    instrument = await service.get_instrument_by_symbol(symbol)
    return {
        "success": True,
        "message": "Instrument retrieved",
        "data": instrument.model_dump(mode="json"),
    }


# --- Admin routes ---
admin_router = APIRouter(prefix="/admin/instruments", tags=["Admin — Instruments"])


@admin_router.post("", summary="Create a new instrument")
async def create_instrument(
    data: InstrumentCreateRequest,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = InstrumentService(session)
    instrument = await service.create_instrument(data, actor_user_id=user_id)
    return {
        "success": True,
        "message": "Instrument created",
        "data": instrument.model_dump(mode="json"),
    }


@admin_router.put("/{instrument_id}", summary="Update an instrument")
async def update_instrument(
    instrument_id: uuid.UUID,
    data: InstrumentUpdateRequest,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = InstrumentService(session)
    instrument = await service.update_instrument(instrument_id, data, actor_user_id=user_id)
    return {
        "success": True,
        "message": "Instrument updated",
        "data": instrument.model_dump(mode="json"),
    }


@admin_router.post("/exchanges", summary="Create a new exchange")
async def create_exchange(
    data: ExchangeCreateRequest,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = InstrumentService(session)
    exchange = await service.create_exchange(data, actor_user_id=user_id)
    return {
        "success": True,
        "message": "Exchange created",
        "data": exchange.model_dump(mode="json"),
    }
