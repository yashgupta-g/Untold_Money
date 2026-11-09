"""
Brokers router — link Angel One / Fyers accounts (read-only), sync, view.
"""

from __future__ import annotations

import uuid
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Cookie, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.dependencies import AsyncSessionDep, CurrentUserIdDep
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.modules.brokers.adapters.base import BrokerError
from app.modules.brokers.service import STATE_TTL_SECONDS, BrokerService

logger = get_logger(__name__)

router = APIRouter(prefix="/brokers", tags=["Brokers"])

STATE_COOKIE = "um_broker_state"


def _cookie_path() -> str:
    return f"/api/{get_settings().API_VERSION}/brokers"


def _ok(message: str, data) -> dict:
    return {"success": True, "message": message, "data": data}


@router.get("", summary="Supported brokers and your connections")
async def overview(session: AsyncSessionDep, user_id: CurrentUserIdDep) -> dict:
    return _ok("Brokers", await BrokerService(session).overview(user_id))


class OwnCredentials(BaseModel):
    app_id: str = Field(..., min_length=1, max_length=100)
    app_secret: Optional[str] = Field(None, max_length=200)


@router.put("/{broker}/credentials", summary="Use your own broker API key (advanced)")
async def save_credentials(
    broker: str, data: OwnCredentials, session: AsyncSessionDep, user_id: CurrentUserIdDep
) -> dict:
    view = await BrokerService(session).save_credentials(user_id, broker, data.app_id, data.app_secret)
    return _ok("API key saved. Connect to sign in with your broker.", view)


@router.delete("/{broker}/credentials", summary="Remove your own API key and its link")
async def remove_credentials(broker: str, session: AsyncSessionDep, user_id: CurrentUserIdDep) -> dict:
    await BrokerService(session).remove_credentials(user_id, broker)
    return _ok("API key removed", None)


@router.post("/{broker}/connect", summary="Start linking a broker account")
async def connect(
    broker: str, response: Response, session: AsyncSessionDep, user_id: CurrentUserIdDep
) -> dict:
    login_url, state = await BrokerService(session).start_connect(user_id, broker)
    # The same state in an httpOnly cookie: the callback must present both.
    response.set_cookie(
        STATE_COOKIE,
        state,
        max_age=STATE_TTL_SECONDS,
        path=_cookie_path(),
        httponly=True,
        secure=not get_settings().is_local,
        samesite="lax",
    )
    return _ok("Continue on your broker's sign-in page", {"login_url": login_url})


@router.get("/{broker}/callback", summary="Broker redirects here after sign-in", include_in_schema=False)
async def callback(
    broker: str,
    request: Request,
    session: AsyncSessionDep,
    um_broker_state: Optional[str] = Cookie(default=None),
) -> RedirectResponse:
    """
    A browser redirect, so there's no bearer token: the user is identified
    by the one-time state. Always lands back on the app's brokers page.
    """
    params = dict(request.query_params)
    base = f"{get_settings().FRONTEND_URL.rstrip('/')}/brokers"
    service = BrokerService(session)
    try:
        conn = await service.complete_connect(broker, params, um_broker_state)
        try:
            await service.sync(conn)
        except AppException as exc:
            # Linked fine; the first sync can be retried from the page.
            logger.warning("broker_initial_sync_failed", broker=broker, error=exc.message)
        await session.commit()
        target = f"{base}?{urlencode({'connected': broker})}"
    except (AppException, BrokerError) as exc:
        await session.rollback()
        message = exc.message if isinstance(exc, AppException) else str(exc)
        target = f"{base}?{urlencode({'error': message, 'broker': broker})}"
    redirect = RedirectResponse(target, status_code=303)
    redirect.delete_cookie(STATE_COOKIE, path=_cookie_path())
    return redirect


@router.post("/connections/{connection_id}/sync", summary="Sync holdings and today's trades")
async def sync(connection_id: uuid.UUID, session: AsyncSessionDep, user_id: CurrentUserIdDep) -> dict:
    service = BrokerService(session)
    conn = await service.get_connection(connection_id, user_id)
    return _ok("Synced", await service.sync(conn))


@router.get("/connections/{connection_id}/snapshot", summary="Live funds and positions")
async def snapshot(
    connection_id: uuid.UUID, session: AsyncSessionDep, user_id: CurrentUserIdDep
) -> dict:
    service = BrokerService(session)
    conn = await service.get_connection(connection_id, user_id)
    return _ok("Snapshot", await service.snapshot(conn))


class RiskSettings(BaseModel):
    # Rupees. None turns the alert off.
    daily_loss_limit: Optional[float] = Field(None, gt=0, le=1_000_000_000)


@router.put("/connections/{connection_id}/risk", summary="Set your daily-loss alert")
async def set_risk(
    connection_id: uuid.UUID, data: RiskSettings, session: AsyncSessionDep, user_id: CurrentUserIdDep
) -> dict:
    service = BrokerService(session)
    conn = await service.get_connection(connection_id, user_id)
    message = "Daily-loss alert saved" if data.daily_loss_limit else "Daily-loss alert off"
    return _ok(message, await service.set_daily_loss_limit(conn, data.daily_loss_limit))


@router.delete("/connections/{connection_id}", summary="Disconnect and delete tokens")
async def disconnect(
    connection_id: uuid.UUID, session: AsyncSessionDep, user_id: CurrentUserIdDep
) -> dict:
    service = BrokerService(session)
    conn = await service.get_connection(connection_id, user_id)
    await service.disconnect(conn)
    return _ok("Disconnected", None)
