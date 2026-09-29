"""
Portfolio router — authenticated endpoints for portfolio and holding management,
including summary analytics and allocation breakdown.
All endpoints require a valid JWT token.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter

from app.core.dependencies import AsyncSessionDep, CurrentUserIdDep
from app.modules.portfolio.schemas import (
    HoldingCreateRequest,
    HoldingUpdateRequest,
    PortfolioCreateRequest,
    PortfolioUpdateRequest,
)
from app.modules.portfolio.service import PortfolioService

router = APIRouter(prefix="/portfolios", tags=["Portfolios"])


@router.get("", summary="List user's portfolios")
async def list_portfolios(
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PortfolioService(session)
    portfolios = await service.list_portfolios(user_id)
    return {
        "success": True,
        "message": "Portfolios retrieved",
        "data": [p.model_dump(mode="json") for p in portfolios],
    }


@router.post("", summary="Create a new portfolio")
async def create_portfolio(
    data: PortfolioCreateRequest,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PortfolioService(session)
    portfolio = await service.create_portfolio(user_id, data)
    return {
        "success": True,
        "message": "Portfolio created",
        "data": portfolio.model_dump(mode="json"),
    }


@router.get("/{portfolio_id}", summary="Get portfolio with enriched holdings")
async def get_portfolio(
    portfolio_id: uuid.UUID,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PortfolioService(session)
    portfolio = await service.get_portfolio(portfolio_id, user_id)
    return {
        "success": True,
        "message": "Portfolio retrieved",
        "data": portfolio.model_dump(mode="json"),
    }


@router.put("/{portfolio_id}", summary="Update portfolio")
async def update_portfolio(
    portfolio_id: uuid.UUID,
    data: PortfolioUpdateRequest,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PortfolioService(session)
    portfolio = await service.update_portfolio(portfolio_id, user_id, data)
    return {
        "success": True,
        "message": "Portfolio updated",
        "data": portfolio.model_dump(mode="json"),
    }


@router.delete("/{portfolio_id}", summary="Delete portfolio")
async def delete_portfolio(
    portfolio_id: uuid.UUID,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PortfolioService(session)
    await service.delete_portfolio(portfolio_id, user_id)
    return {
        "success": True,
        "message": "Portfolio deleted",
        "data": None,
    }


# ---------- Holdings ----------

@router.post("/{portfolio_id}/holdings", summary="Add a holding to portfolio")
async def add_holding(
    portfolio_id: uuid.UUID,
    data: HoldingCreateRequest,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PortfolioService(session)
    holding = await service.add_holding(portfolio_id, user_id, data)
    return {
        "success": True,
        "message": "Holding added",
        "data": holding.model_dump(mode="json"),
    }


@router.put("/{portfolio_id}/holdings/{holding_id}", summary="Update a holding")
async def update_holding(
    portfolio_id: uuid.UUID,
    holding_id: uuid.UUID,
    data: HoldingUpdateRequest,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PortfolioService(session)
    holding = await service.update_holding(portfolio_id, holding_id, user_id, data)
    return {
        "success": True,
        "message": "Holding updated",
        "data": holding.model_dump(mode="json"),
    }


@router.delete("/{portfolio_id}/holdings/{holding_id}", summary="Remove a holding")
async def remove_holding(
    portfolio_id: uuid.UUID,
    holding_id: uuid.UUID,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PortfolioService(session)
    await service.remove_holding(portfolio_id, holding_id, user_id)
    return {
        "success": True,
        "message": "Holding removed",
        "data": None,
    }


# ---------- Analytics ----------

@router.get("/{portfolio_id}/summary", summary="Portfolio summary analytics")
async def get_portfolio_summary(
    portfolio_id: uuid.UUID,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PortfolioService(session)
    summary = await service.get_portfolio_summary(portfolio_id, user_id)
    return {
        "success": True,
        "message": "Portfolio summary retrieved",
        "data": summary.model_dump(mode="json"),
    }


@router.get("/{portfolio_id}/allocation", summary="Portfolio allocation breakdown")
async def get_portfolio_allocation(
    portfolio_id: uuid.UUID,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = PortfolioService(session)
    allocation = await service.get_portfolio_allocation(portfolio_id, user_id)
    return {
        "success": True,
        "message": "Portfolio allocation retrieved",
        "data": allocation.model_dump(mode="json"),
    }
