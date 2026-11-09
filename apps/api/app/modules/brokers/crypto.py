"""
Encryption for broker tokens at rest (Fernet: AES-128-CBC + HMAC-SHA256).

The key comes from BROKER_TOKEN_KEY (generate one with
`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
and keep it in Secrets Manager). Outside local development a missing key is
an error. Locally, a key derived from JWT_SECRET_KEY is used so the stack
runs out of the box.

Planned: envelope encryption with an AWS KMS data key, so the master key
never sits in application memory.
"""

from __future__ import annotations

import base64
import hashlib
from functools import lru_cache
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@lru_cache
def _cipher() -> Fernet:
    settings = get_settings()
    key = settings.BROKER_TOKEN_KEY
    if not key:
        if not settings.is_local:
            raise RuntimeError("BROKER_TOKEN_KEY must be set to store broker tokens")
        logger.warning("broker_token_key_derived_for_local_dev")
        key = base64.urlsafe_b64encode(
            hashlib.sha256(f"broker-tokens:{settings.JWT_SECRET_KEY}".encode()).digest()
        ).decode()
    return Fernet(key.encode())


def encrypt(value: Optional[str]) -> Optional[str]:
    return _cipher().encrypt(value.encode()).decode() if value else None


def decrypt(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        return _cipher().decrypt(value.encode()).decode()
    except InvalidToken:
        # Key rotated or data corrupted: treat as no token (user reconnects).
        logger.warning("broker_token_decrypt_failed")
        return None
