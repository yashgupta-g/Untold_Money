"""
Rate limiting — Redis token buckets, one per client IP and route class.

Each bucket holds `capacity` tokens and refills continuously at
capacity / 60 tokens per second, so a client can burst up to the limit and
then sustain the per-minute rate. The check and the decrement run as one
Lua script, so concurrent requests can't overspend a bucket.

Fails open: if Redis is unreachable, requests are allowed and a warning is
logged. An outage in the limiter must not take the API down with it.
"""

from __future__ import annotations

import math
import time
from typing import Optional

from fastapi.responses import ORJSONResponse
from redis.asyncio import Redis
from redis.exceptions import RedisError
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# KEYS[1] bucket key; ARGV: capacity, refill per second, now (seconds).
# Returns {allowed (0/1), seconds until a token is available}.
_TOKEN_BUCKET = """
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local state = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(state[1]) or capacity
local ts = tonumber(state[2]) or now
tokens = math.min(capacity, tokens + (now - ts) * rate)
local allowed = 0
local wait = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  wait = (1 - tokens) / rate
end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], math.ceil(capacity / rate) + 1)
return {allowed, tostring(wait)}
"""

# Paths that brute-force and credential-stuffing attacks target.
_AUTH_SUFFIXES = ("/auth/login", "/auth/register", "/auth/refresh")
# Never limited: health checks from load balancers, docs.
_EXEMPT_PREFIXES = ("/health", "/version", "/docs", "/redoc", "/openapi.json")


def _client_ip(scope: Scope) -> str:
    for name, value in scope.get("headers", []):
        if name == b"x-forwarded-for":
            return value.decode().split(",")[0].strip()
    client = scope.get("client")
    return client[0] if client else "unknown"


class RateLimitMiddleware:
    """Pure ASGI middleware, so streaming responses (MCP SSE) pass untouched."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self._redis: Optional[Redis] = None
        self._script = None

    def _client(self) -> Redis:
        if self._redis is None:
            settings = get_settings()
            self._redis = Redis.from_url(settings.REDIS_URL, socket_timeout=0.25)
            self._script = self._redis.register_script(_TOKEN_BUCKET)
        return self._redis

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        settings = get_settings()
        path = scope.get("path", "")
        if (
            scope["type"] != "http"
            or not settings.RATE_LIMIT_ENABLED
            or scope.get("method") == "OPTIONS"
            or path.startswith(_EXEMPT_PREFIXES)
        ):
            await self.app(scope, receive, send)
            return

        is_auth = path.endswith(_AUTH_SUFFIXES)
        capacity = settings.RATE_LIMIT_AUTH_PER_MINUTE if is_auth else settings.RATE_LIMIT_PER_MINUTE
        bucket = f"rl:{'auth' if is_auth else 'api'}:{_client_ip(scope)}"

        try:
            self._client()
            allowed, wait = await self._script(  # type: ignore[misc]
                keys=[bucket], args=[capacity, capacity / 60, time.time()]
            )
        except RedisError as exc:
            logger.warning("rate_limit_unavailable", error=str(exc))
            await self.app(scope, receive, send)
            return

        if int(allowed):
            await self.app(scope, receive, send)
            return

        retry_after = max(1, math.ceil(float(wait)))
        response = ORJSONResponse(
            status_code=429,
            content={
                "success": False,
                "message": "Too many requests. Please wait a moment and try again.",
                "error_code": "RATE_LIMITED",
            },
            headers={"Retry-After": str(retry_after)},
        )
        await response(scope, receive, send)
