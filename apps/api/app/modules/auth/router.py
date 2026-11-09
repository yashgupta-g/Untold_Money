"""
Auth router — HTTP endpoints for authentication.

Token transport:
- The access token is returned in the JSON body. Clients keep it in memory
  and send it as `Authorization: Bearer …`.
- The refresh token is never returned in the body. It travels only in an
  httpOnly cookie scoped to the auth endpoints, so page scripts can't read
  it. `POST /auth/refresh` rotates it.
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Cookie, Request, Response, status
from fastapi.responses import ORJSONResponse
from jose import JWTError

from app.core.config import get_settings
from app.core.dependencies import AsyncSessionDep, CurrentUserIdDep, get_client_ip, get_user_agent
from app.core.exceptions import UnauthorizedException
from app.core.security import decode_token
from app.modules.auth.schemas import (
    ApiResponse,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_COOKIE = "um_refresh"


def _cookie_path() -> str:
    """Sent only to the auth endpoints, never to the rest of the API."""
    return f"/api/{get_settings().API_VERSION}/auth"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=_cookie_path(),
        httponly=True,
        secure=not settings.is_local,
        # Lax: sent on same-site requests (app.* → api.* in production) but
        # not on cross-site POSTs, which blocks CSRF against /refresh.
        samesite="lax",
    )


def _clear_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=REFRESH_COOKIE,
        path=_cookie_path(),
        httponly=True,
        secure=not settings.is_local,
        samesite="lax",
    )


def _auth_payload(result: AuthResponse, response: Response) -> dict:
    """Move the refresh token out of the body and into the cookie."""
    data = result.model_dump(mode="json")
    refresh_token = data["tokens"].pop("refresh_token")
    _set_refresh_cookie(response, refresh_token)
    return data


def _session_id_from_header(authorization: Optional[str]) -> Optional[uuid.UUID]:
    """Best-effort session id from an access token, even an expired one."""
    if not authorization:
        return None
    _, _, token = authorization.partition(" ")
    try:
        payload = decode_token(token)
    except JWTError:
        return None
    try:
        return uuid.UUID(payload.get("sid", ""))
    except ValueError:
        return None


@router.post(
    "/register",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    data: RegisterRequest,
    request: Request,
    response: Response,
    session: AsyncSessionDep,
) -> dict:
    service = AuthService(session)
    result = await service.register(
        data, ip_address=get_client_ip(request), user_agent=get_user_agent(request)
    )
    return {
        "success": True,
        "message": "Registration successful",
        "data": _auth_payload(result, response),
    }


@router.post(
    "/login",
    response_model=ApiResponse,
    summary="Login with email and password",
)
async def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSessionDep,
) -> dict:
    service = AuthService(session)
    result = await service.login(
        data, ip_address=get_client_ip(request), user_agent=get_user_agent(request)
    )
    return {
        "success": True,
        "message": "Login successful",
        "data": _auth_payload(result, response),
    }


@router.post(
    "/refresh",
    response_model=ApiResponse,
    summary="Rotate the refresh cookie and issue a new access token",
)
async def refresh(
    request: Request,
    response: Response,
    session: AsyncSessionDep,
    um_refresh: Optional[str] = Cookie(default=None),
) -> dict | ORJSONResponse:
    if not um_refresh:
        raise UnauthorizedException("Session has ended. Please log in again.")
    service = AuthService(session)
    try:
        result = await service.refresh(
            um_refresh, ip_address=get_client_ip(request), user_agent=get_user_agent(request)
        )
    except UnauthorizedException as exc:
        # Return (not raise) so the dead cookie can be cleared on this same
        # response; a raised exception would discard the deletion.
        failed = ORJSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"success": False, "message": exc.message, "error_code": "SESSION_ENDED"},
        )
        _clear_refresh_cookie(failed)
        return failed
    return {
        "success": True,
        "message": "Session refreshed",
        "data": _auth_payload(result, response),
    }


@router.post(
    "/logout",
    response_model=ApiResponse,
    summary="Logout and revoke the current session",
)
async def logout(
    request: Request,
    response: Response,
    session: AsyncSessionDep,
    um_refresh: Optional[str] = Cookie(default=None),
) -> dict:
    # No access token required: logging out must work after it has expired.
    service = AuthService(session)
    await service.logout(
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        refresh_token=um_refresh,
        session_id=_session_id_from_header(request.headers.get("authorization")),
    )
    _clear_refresh_cookie(response)
    return {
        "success": True,
        "message": "Logged out successfully",
        "data": None,
    }


@router.get(
    "/me",
    response_model=ApiResponse,
    summary="Get current authenticated user",
)
async def get_me(
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = AuthService(session)
    user = await service.get_current_user(user_id)
    return {
        "success": True,
        "message": "User retrieved",
        "data": user.model_dump(mode="json"),
    }
