"""
Auth repository — data access layer for authentication operations.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import User, UserConsent, UserSession


class AuthRepository:
    """Data access for auth-related operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # --- User ---

    async def get_user_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_user(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    # --- Sessions ---

    async def create_session(self, session_obj: UserSession) -> UserSession:
        self.session.add(session_obj)
        await self.session.flush()
        return session_obj

    async def get_session_by_token_hash(
        self, token_hash: str, user_id: Optional[uuid.UUID] = None
    ) -> Optional[UserSession]:
        stmt = select(UserSession).where(
            UserSession.refresh_token_hash == token_hash,
            UserSession.revoked_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke_sessions(self, user_id: uuid.UUID, token_hash: Optional[str] = None) -> None:
        stmt = (
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
            )
        )
        if token_hash:
            stmt = stmt.where(UserSession.refresh_token_hash == token_hash)

        stmt = stmt.values(revoked_at=datetime.now(timezone.utc))
        await self.session.execute(stmt)

    async def revoke_all_user_sessions(self, user_id: uuid.UUID) -> None:
        stmt = (
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self.session.execute(stmt)

    # --- Consents ---

    async def create_consent(self, consent: UserConsent) -> UserConsent:
        self.session.add(consent)
        await self.session.flush()
        return consent
