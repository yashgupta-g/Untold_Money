"""
Auth session lifecycle: refresh cookie, rotation, reuse detection, logout
and immediate revocation, and the admin role guard.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.modules.audit.models import AuditLog
from app.modules.users.models import User, UserSession

PASSWORD = "Str0ngPassw0rd"


async def _register(client: AsyncClient, email: str | None = None) -> dict:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test Trader",
            "email": email or f"trader-{uuid.uuid4().hex[:8]}@example.com",
            "password": PASSWORD,
            "accept_terms": True,
            "accept_privacy": True,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def _bearer(data: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {data['tokens']['access_token']}"}


async def test_register_sets_httponly_refresh_cookie_and_hides_token(db_client: AsyncClient):
    response = await db_client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test Trader",
            "email": "cookie@example.com",
            "password": PASSWORD,
            "accept_terms": True,
            "accept_privacy": True,
        },
    )
    assert response.status_code == 201
    assert "refresh_token" not in response.json()["data"]["tokens"]

    cookie = response.headers["set-cookie"]
    assert cookie.startswith("um_refresh=")
    assert "HttpOnly" in cookie
    assert "Path=/api/v1/auth" in cookie
    assert "SameSite=lax" in cookie


async def test_access_token_works_until_logout_then_is_rejected(db_client: AsyncClient):
    data = await _register(db_client)
    headers = _bearer(data)

    assert (await db_client.get("/api/v1/auth/me", headers=headers)).status_code == 200

    logout = await db_client.post("/api/v1/auth/logout", headers=headers)
    assert logout.status_code == 200
    assert 'um_refresh=""' in logout.headers["set-cookie"]

    # The access token hasn't expired, but its session has ended.
    assert (await db_client.get("/api/v1/auth/me", headers=headers)).status_code == 401


async def test_refresh_rotates_session(db_client: AsyncClient, db_session):
    data = await _register(db_client)
    old_cookie = db_client.cookies.get("um_refresh")

    response = await db_client.post("/api/v1/auth/refresh")
    assert response.status_code == 200, response.text
    new_data = response.json()["data"]
    assert db_client.cookies.get("um_refresh") != old_cookie

    # New access token works; the old one's session is revoked.
    assert (await db_client.get("/api/v1/auth/me", headers=_bearer(new_data))).status_code == 200
    assert (await db_client.get("/api/v1/auth/me", headers=_bearer(data))).status_code == 401

    user_id = uuid.UUID(data["user"]["id"])
    sessions = (
        await db_session.execute(select(UserSession).where(UserSession.user_id == user_id))
    ).scalars().all()
    assert len(sessions) == 2
    assert sum(s.revoked_at is None for s in sessions) == 1


async def test_replayed_refresh_token_revokes_every_session(db_client: AsyncClient, db_session):
    data = await _register(db_client)
    stolen = db_client.cookies.get("um_refresh")

    assert (await db_client.post("/api/v1/auth/refresh")).status_code == 200
    current = db_client.cookies.get("um_refresh")

    # Replaying the rotated token is treated as theft.
    db_client.cookies.set("um_refresh", stolen, path="/api/v1/auth")
    replay = await db_client.post("/api/v1/auth/refresh")
    assert replay.status_code == 401
    assert replay.json()["error_code"] == "SESSION_ENDED"

    # Even the legitimate latest token is now dead.
    db_client.cookies.set("um_refresh", current, path="/api/v1/auth")
    assert (await db_client.post("/api/v1/auth/refresh")).status_code == 401

    user_id = uuid.UUID(data["user"]["id"])
    active = (
        await db_session.execute(
            select(UserSession).where(
                UserSession.user_id == user_id, UserSession.revoked_at.is_(None)
            )
        )
    ).scalars().all()
    assert active == []

    events = (
        await db_session.execute(
            select(AuditLog.action).where(AuditLog.actor_user_id == user_id)
        )
    ).scalars().all()
    assert "session.refresh_reuse_detected" in events


async def test_refresh_without_cookie_is_rejected(db_client: AsyncClient):
    assert (await db_client.post("/api/v1/auth/refresh")).status_code == 401


async def test_failed_login_is_audited(db_client: AsyncClient, db_session):
    data = await _register(db_client, email="audit@example.com")
    response = await db_client.post(
        "/api/v1/auth/login", json={"email": "audit@example.com", "password": "WrongPassw0rd"}
    )
    assert response.status_code == 401

    user_id = uuid.UUID(data["user"]["id"])
    events = (
        await db_session.execute(select(AuditLog.action).where(AuditLog.entity_id == str(user_id)))
    ).scalars().all()
    assert "user.login_failed" in events


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/admin/analytics/recalculate/RELIANCE",
        "/api/v1/admin/instruments/exchanges",
    ],
)
async def test_admin_routes_reject_non_admins(db_client: AsyncClient, path: str):
    data = await _register(db_client)
    response = await db_client.post(path, headers=_bearer(data), json={})
    assert response.status_code == 403


async def test_admin_role_passes_guard(db_client: AsyncClient, db_session):
    data = await _register(db_client)
    await db_session.execute(
        update(User).where(User.id == uuid.UUID(data["user"]["id"])).values(role="admin")
    )
    await db_session.commit()

    # Past the guard: an empty body now fails validation, not authorisation.
    response = await db_client.post(
        "/api/v1/admin/instruments/exchanges", headers=_bearer(data), json={}
    )
    assert response.status_code == 422
