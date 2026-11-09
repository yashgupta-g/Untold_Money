"""
Paper trading router — practice accounts with virtual cash.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Query, status

from app.core.dependencies import AsyncSessionDep, CurrentUserIdDep
from app.modules.paper.schemas import PaperAccountCreate, PaperOrderCreate
from app.modules.paper.service import PaperService

router = APIRouter(prefix="/paper", tags=["Paper trading"])


def _ok(message: str, data) -> dict:
    return {"success": True, "message": message, "data": data}


@router.get("/accounts", summary="List your paper accounts")
async def list_accounts(session: AsyncSessionDep, user_id: CurrentUserIdDep) -> dict:
    service = PaperService(session, user_id=user_id)
    accounts = await service.list_accounts(user_id)
    views = []
    for account in accounts:
        await service.match_open_orders(account)
        views.append((await service.account_view(account)).model_dump(mode="json"))
    return _ok("Paper accounts", views)


@router.post("/accounts", status_code=status.HTTP_201_CREATED, summary="Open a paper account")
async def create_account(
    data: PaperAccountCreate, session: AsyncSessionDep, user_id: CurrentUserIdDep
) -> dict:
    view = await PaperService(session, user_id=user_id).create_account(user_id, data)
    return _ok("Paper account created", view.model_dump(mode="json"))


@router.get("/accounts/{account_id}", summary="Account balances and positions")
async def get_account(
    account_id: uuid.UUID, session: AsyncSessionDep, user_id: CurrentUserIdDep
) -> dict:
    service = PaperService(session, user_id=user_id)
    account = await service.get_account(account_id, user_id)
    await service.match_open_orders(account)
    return _ok("Paper account", (await service.account_view(account)).model_dump(mode="json"))


@router.post("/accounts/{account_id}/reset", summary="Reset to starting cash")
async def reset_account(
    account_id: uuid.UUID, session: AsyncSessionDep, user_id: CurrentUserIdDep
) -> dict:
    service = PaperService(session, user_id=user_id)
    account = await service.get_account(account_id, user_id)
    view = await service.reset_account(account)
    return _ok("Paper account reset", view.model_dump(mode="json"))


@router.get("/accounts/{account_id}/orders", summary="Order history")
async def list_orders(
    account_id: uuid.UUID,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
    limit: int = Query(100, ge=1, le=500),
) -> dict:
    service = PaperService(session, user_id=user_id)
    account = await service.get_account(account_id, user_id)
    orders = await service.list_orders(account, limit=limit)
    return _ok("Paper orders", [o.model_dump(mode="json") for o in orders])


@router.post(
    "/accounts/{account_id}/orders",
    status_code=status.HTTP_201_CREATED,
    summary="Place a paper order",
)
async def place_order(
    account_id: uuid.UUID,
    data: PaperOrderCreate,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PaperService(session, user_id=user_id)
    account = await service.get_account(account_id, user_id)
    order = await service.place_order(account, data)
    messages = {
        "FILLED": "Order filled",
        "OPEN": "Order placed; it fills when the price is reached",
        "REJECTED": "Order rejected",
    }
    return _ok(messages.get(order.status, "Order placed"), order.model_dump(mode="json"))


@router.delete("/accounts/{account_id}/orders/{order_id}", summary="Cancel an open order")
async def cancel_order(
    account_id: uuid.UUID,
    order_id: uuid.UUID,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PaperService(session, user_id=user_id)
    account = await service.get_account(account_id, user_id)
    order = await service.cancel_order(account, order_id)
    return _ok("Order cancelled", order.model_dump(mode="json"))
