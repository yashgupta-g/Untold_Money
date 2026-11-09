"""
API-key guard for the MCP server mount.

The MCP tools read market data and run models; outside local development
they must not be open to anyone who finds the URL.
"""

from __future__ import annotations

import hmac

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send


def require_api_key(app: ASGIApp, api_key: str) -> ASGIApp:
    """Wrap an ASGI app so every HTTP request needs `Authorization: Bearer <api_key>`."""
    expected = f"Bearer {api_key}".encode()

    async def guarded(scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            sent = dict(scope.get("headers", [])).get(b"authorization", b"")
            if not hmac.compare_digest(sent, expected):
                response = JSONResponse(
                    {"success": False, "message": "Unauthorized", "error_code": "UNAUTHORIZED"},
                    status_code=401,
                )
                await response(scope, receive, send)
                return
        await app(scope, receive, send)

    return guarded
