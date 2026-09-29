"""
Security utilities — JWT token management and password hashing.

All settings are read from get_settings() at call time, not import time,
to avoid import-time side effects and improve testability.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

# Password hashing context (stateless — safe at module level)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _get_jwt_config() -> tuple[str, str]:
    """Lazy-load JWT config to avoid import-time settings resolution."""
    from app.core.config import get_settings

    s = get_settings()
    return s.JWT_SECRET_KEY, s.JWT_ALGORITHM


def hash_password(password: str) -> str:
    """Hash a plaintext password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    subject: str,
    extra_claims: Optional[dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT access token."""
    from app.core.config import get_settings

    settings = get_settings()
    secret, algorithm = settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": now,
        "type": "access",
    }
    if extra_claims:
        to_encode.update(extra_claims)
    return jwt.encode(to_encode, secret, algorithm=algorithm)


def create_refresh_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT refresh token."""
    from app.core.config import get_settings

    settings = get_settings()
    secret, algorithm = settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode = {
        "sub": subject,
        "exp": expire,
        "iat": now,
        "type": "refresh",
        "jti": secrets.token_urlsafe(32),
    }
    return jwt.encode(to_encode, secret, algorithm=algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token. Raises JWTError on failure."""
    secret, algorithm = _get_jwt_config()
    try:
        payload = jwt.decode(token, secret, algorithms=[algorithm])
        return payload
    except JWTError:
        raise


def hash_token(token: str) -> str:
    """Hash a token for secure storage (refresh tokens)."""
    return hashlib.sha256(token.encode()).hexdigest()


def generate_token() -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(64)
