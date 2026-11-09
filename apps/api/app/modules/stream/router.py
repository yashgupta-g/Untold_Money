"""
WebSocket /api/v1/stream — live prices and day P&L from the user's broker.

Protocol (JSON messages):
  client → {"type": "auth", "token": "<access JWT>"}      first, within 5s;
                                                          again after a refresh
           {"type": "subscribe" | "unsubscribe", "symbols": ["RELIANCE", …]}
           {"type": "ping"}
  server → {"type": "status", "live": bool, "state", "provider"}
           {"type": "tick", "symbol", "ltp", "ch", "chp", "volume", "ts", "provider"}
           {"type": "pnl", "day_pnl", "limit", "breached", "open_positions"}
           {"type": "risk", "breached": true, "limit", "day_pnl"}
           {"type": "error", "code", "message"} · {"type": "pong"}

The token travels in a message, never the URL, so it stays out of access
logs. The session behind it is re-checked every few minutes and on every
re-auth; an ended session closes the socket with code 4401.
"""

from __future__ import annotations

import asyncio
import contextlib
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.core.database import get_session_factory
from app.core.dependencies import resolve_access_token, session_is_live
from app.core.exceptions import UnauthorizedException
from app.core.logging import get_logger
from app.modules.stream.hub import MAX_SYMBOLS, Client, StreamHub

logger = get_logger(__name__)

router = APIRouter(tags=["Live prices"])

AUTH_TIMEOUT_SECONDS = 5.0
SESSION_CHECK_SECONDS = 300.0
CLOSE_UNAUTHORIZED = 4401
CLOSE_FORBIDDEN_ORIGIN = 4403
_SYMBOL = re.compile(r"^[A-Z0-9&\-]{1,30}$")

_hub: Optional[StreamHub] = None


def get_hub() -> StreamHub:
    global _hub
    if _hub is None:
        _hub = StreamHub()
    return _hub


async def shutdown_hub() -> None:
    if _hub is not None:
        await _hub.shutdown()


def get_stream_session_factory() -> async_sessionmaker[AsyncSession]:
    """Short sessions for auth checks; a socket never holds one open."""
    return get_session_factory()


async def _authenticate(
    factory: async_sessionmaker[AsyncSession], token: object
) -> Optional[tuple[uuid.UUID, uuid.UUID]]:
    if not isinstance(token, str) or not token:
        return None
    async with factory() as session:
        try:
            return await resolve_access_token(session, token)
        except UnauthorizedException:
            return None


def _symbols(message: dict) -> list[str]:
    raw = message.get("symbols")
    if not isinstance(raw, list):
        return []
    cleaned = [str(s).strip().upper() for s in raw[:MAX_SYMBOLS]]
    return [s for s in dict.fromkeys(cleaned) if _SYMBOL.match(s)]


async def _close(ws: WebSocket, code: int, message: str) -> None:
    with contextlib.suppress(Exception):
        await ws.send_json({"type": "error", "code": "unauthorized", "message": message})
    with contextlib.suppress(Exception):
        await ws.close(code=code)


@router.websocket("/stream")
async def stream(
    ws: WebSocket,
    hub: StreamHub = Depends(get_hub),
    factory: async_sessionmaker[AsyncSession] = Depends(get_stream_session_factory),
) -> None:
    origin = ws.headers.get("origin")
    if origin and origin.rstrip("/") not in {o.rstrip("/") for o in get_settings().BACKEND_CORS_ORIGINS}:
        await ws.close(code=CLOSE_FORBIDDEN_ORIGIN)
        return

    await ws.accept()
    try:
        first = await asyncio.wait_for(ws.receive_json(), timeout=AUTH_TIMEOUT_SECONDS)
    except (asyncio.TimeoutError, ValueError, WebSocketDisconnect):
        await _close(ws, CLOSE_UNAUTHORIZED, "Sign in to see live prices.")
        return
    identity = await _authenticate(factory, first.get("token")) if first.get("type") == "auth" else None
    if identity is None:
        await _close(ws, CLOSE_UNAUTHORIZED, "Sign in to see live prices.")
        return
    user_id, sid = identity
    state = {"sid": sid}

    client = await hub.attach(user_id)

    async def reader() -> None:
        while True:
            message = await ws.receive_json()
            kind = message.get("type") if isinstance(message, dict) else None
            if kind == "subscribe":
                refused = hub.subscribe(client, _symbols(message))
                if refused:
                    client.send(
                        {
                            "type": "error",
                            "code": "symbol_limit",
                            "message": f"Live prices are limited to {MAX_SYMBOLS} symbols at a time.",
                            "symbols": refused,
                        }
                    )
            elif kind == "unsubscribe":
                hub.unsubscribe(client, _symbols(message))
            elif kind == "auth":  # after the app refreshes its access token
                renewed = await _authenticate(factory, message.get("token"))
                if renewed is None or renewed[0] != user_id:
                    return await _close(ws, CLOSE_UNAUTHORIZED, "Your session has ended.")
                state["sid"] = renewed[1]
            elif kind == "ping":
                client.send({"type": "pong"})

    async def writer() -> None:
        while True:
            await ws.send_json(await client.queue.get())

    async def watchdog() -> None:
        while True:
            await asyncio.sleep(SESSION_CHECK_SECONDS)
            async with factory() as session:
                alive = await session_is_live(session, user_id, state["sid"])
            if not alive:
                return await _close(ws, CLOSE_UNAUTHORIZED, "Your session has ended.")

    tasks = [asyncio.create_task(t()) for t in (reader, writer, watchdog)]
    try:
        await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    finally:
        for task in tasks:
            task.cancel()
        for task in tasks:
            with contextlib.suppress(asyncio.CancelledError, WebSocketDisconnect, Exception):
                await task
        await hub.detach(client)
        with contextlib.suppress(Exception):
            await ws.close()
