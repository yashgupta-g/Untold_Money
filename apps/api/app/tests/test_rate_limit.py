"""
Rate limiter: per-IP token buckets in Redis, stricter on auth endpoints.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

from app.core.config import get_settings


@pytest.fixture
def limits():
    settings = get_settings()
    saved = (
        settings.RATE_LIMIT_ENABLED,
        settings.RATE_LIMIT_AUTH_PER_MINUTE,
        settings.RATE_LIMIT_PER_MINUTE,
    )
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_AUTH_PER_MINUTE = 3
    settings.RATE_LIMIT_PER_MINUTE = 5
    yield
    (
        settings.RATE_LIMIT_ENABLED,
        settings.RATE_LIMIT_AUTH_PER_MINUTE,
        settings.RATE_LIMIT_PER_MINUTE,
    ) = saved


def _ip() -> dict[str, str]:
    # A fresh client IP per test, so buckets from other runs never interfere.
    return {"X-Forwarded-For": f"10.{uuid.uuid4().int % 250}.{uuid.uuid4().int % 250}.7"}


async def test_auth_endpoints_are_limited(client: AsyncClient, limits):
    headers = _ip()
    statuses = [
        (await client.post("/api/v1/auth/refresh", headers=headers)).status_code for _ in range(4)
    ]
    assert statuses[:3] == [401, 401, 401]
    assert statuses[3] == 429


async def test_429_has_retry_after_and_envelope(client: AsyncClient, limits):
    headers = _ip()
    for _ in range(3):
        await client.post("/api/v1/auth/refresh", headers=headers)
    response = await client.post("/api/v1/auth/refresh", headers=headers)
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) >= 1
    assert response.json()["error_code"] == "RATE_LIMITED"


async def test_health_is_never_limited(client: AsyncClient, limits):
    headers = _ip()
    for _ in range(10):
        assert (await client.get("/health", headers=headers)).status_code == 200


async def test_separate_ips_have_separate_buckets(client: AsyncClient, limits):
    first, second = _ip(), _ip()
    for _ in range(3):
        await client.post("/api/v1/auth/refresh", headers=first)
    assert (await client.post("/api/v1/auth/refresh", headers=first)).status_code == 429
    assert (await client.post("/api/v1/auth/refresh", headers=second)).status_code == 401
