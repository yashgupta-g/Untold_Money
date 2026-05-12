"""
FastAPI dependency injection providers.
Centralizes session, auth, and service dependencies.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, Header, Request
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_async_session
from app.core.exceptions import UnauthorizedException
from app.core.security import decode_token

# Type aliases for dependency injection
AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


async def get_current_user_id(
    request: Request,
    authorization: str | None = Header(default=None),
) -> uuid.UUID:
    """
    Extract and validate the current user from the JWT access token.
    Returns the user UUID.
    """
    if not authorization:
        raise UnauthorizedException("Missing authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthorizedException("Invalid authorization scheme")

    try:
        payload = decode_token(token)
    except JWTError:
        raise UnauthorizedException("Invalid or expired token")

    token_type = payload.get("type")
    if token_type != "access":
        raise UnauthorizedException("Invalid token type")

    subject = payload.get("sub")
    if not subject:
        raise UnauthorizedException("Invalid token payload")

    try:
        return uuid.UUID(subject)
    except ValueError:
        raise UnauthorizedException("Invalid token subject")


CurrentUserIdDep = Annotated[uuid.UUID, Depends(get_current_user_id)]


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, respecting X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_user_agent(request: Request) -> str:
    """Extract User-Agent header."""
    return request.headers.get("user-agent", "unknown")
