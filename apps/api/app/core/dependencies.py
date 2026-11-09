"""
FastAPI dependency injection providers.
Centralizes session, auth, and service dependencies.
"""

from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import Depends, Header, Request
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_async_session
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token

# Type aliases for dependency injection
AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


async def resolve_access_token(session: AsyncSession, token: str) -> tuple[uuid.UUID, uuid.UUID]:
    """
    Validate an access JWT and return (user_id, session_id).

    The token must name a live session (`sid` claim): one that hasn't been
    revoked by logout, refresh rotation or a security event, and hasn't
    expired. This makes logout take effect immediately rather than when the
    access token runs out. Shared by HTTP auth and the live-price WebSocket.
    """
    try:
        payload = decode_token(token)
    except JWTError:
        raise UnauthorizedException("Invalid or expired token")

    if payload.get("type") != "access":
        raise UnauthorizedException("Invalid token type")

    subject = payload.get("sub")
    session_id = payload.get("sid")
    if not subject or not session_id:
        raise UnauthorizedException("Invalid token payload")

    try:
        user_id = uuid.UUID(subject)
        sid = uuid.UUID(session_id)
    except ValueError:
        raise UnauthorizedException("Invalid token subject")

    if not await session_is_live(session, user_id, sid):
        raise UnauthorizedException("Session has ended. Please log in again.")
    return user_id, sid


async def session_is_live(session: AsyncSession, user_id: uuid.UUID, sid: uuid.UUID) -> bool:
    # Imported here to keep core free of module imports at load time.
    from app.modules.users.models import UserSession

    user_session = await session.get(UserSession, sid, populate_existing=True)
    return bool(user_session and user_session.user_id == user_id and user_session.is_active)


def _bearer(authorization: Optional[str]) -> str:
    if not authorization:
        raise UnauthorizedException("Missing authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthorizedException("Invalid authorization scheme")
    return token


async def get_current_user_id(
    request: Request,
    session: AsyncSessionDep,
    authorization: Optional[str] = Header(default=None),
) -> uuid.UUID:
    """The current user from the access token (see resolve_access_token)."""
    user_id, sid = await resolve_access_token(session, _bearer(authorization))
    request.state.session_id = sid
    return user_id


CurrentUserIdDep = Annotated[uuid.UUID, Depends(get_current_user_id)]


def require_role(*roles: str):
    """
    Dependency factory: allow only users whose role is one of `roles`.
    Returns the user UUID, like CurrentUserIdDep.
    """

    async def _check(session: AsyncSessionDep, user_id: CurrentUserIdDep) -> uuid.UUID:
        from app.modules.users.models import User

        user = await session.get(User, user_id)
        if not user or user.status != "active" or user.role not in roles:
            raise ForbiddenException("You don't have permission to do this")
        return user_id

    return _check


AdminUserIdDep = Annotated[uuid.UUID, Depends(require_role("admin"))]


async def get_optional_user_id(
    session: AsyncSessionDep,
    authorization: Optional[str] = Header(default=None),
) -> Optional[uuid.UUID]:
    """
    Same checks as get_current_user_id but returns None instead of 401.
    Use for public endpoints that personalise for signed-in users. An
    expired or revoked token counts as signed out, so it never unlocks a
    user's own data (such as their broker's live prices).
    """
    if not authorization:
        return None
    try:
        user_id, _ = await resolve_access_token(session, _bearer(authorization))
    except UnauthorizedException:
        return None
    return user_id


OptionalUserIdDep = Annotated[Optional[uuid.UUID], Depends(get_optional_user_id)]


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, respecting X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_user_agent(request: Request) -> str:
    """Extract User-Agent header."""
    return request.headers.get("user-agent", "unknown")
