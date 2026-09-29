"""
Auth service — business logic for registration, login, logout, and token management.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.modules.auth.exceptions import (
    AccountDisabledException,
    EmailAlreadyExistsException,
    InvalidCredentialsException,
)
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.modules.audit.service import AuditService
from app.modules.users.models import User, UserConsent, UserSession

logger = get_logger(__name__)


class AuthService:
    """Authentication business logic."""

    def __init__(self, session: AsyncSession):
        self.repo = AuthRepository(session)
        self.audit = AuditService(session)

    async def register(
        self,
        data: RegisterRequest,
        ip_address: str,
        user_agent: str,
    ) -> AuthResponse:
        """Register a new user with consent logging."""
        # Check for existing user
        existing = await self.repo.get_user_by_email(data.email)
        if existing:
            raise EmailAlreadyExistsException()

        # Create user
        user = User(
            full_name=data.full_name,
            email=data.email.lower(),
            phone=data.phone,
            password_hash=hash_password(data.password),
        )
        user = await self.repo.create_user(user)

        # Log consents
        for consent_type in ["terms_of_service", "privacy_policy"]:
            consent = UserConsent(
                user_id=user.id,
                consent_type=consent_type,
                version="1.0",
                accepted=True,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            await self.repo.create_consent(consent)

        # Create tokens and session
        tokens = await self._create_tokens_and_session(
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Audit log
        await self.audit.log_event(
            action="user.registered",
            entity_type="user",
            entity_id=str(user.id),
            actor_user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info("user_registered", user_id=str(user.id), email=user.email)

        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=tokens,
        )

    async def login(
        self,
        data: LoginRequest,
        ip_address: str,
        user_agent: str,
    ) -> AuthResponse:
        """Authenticate user and return tokens."""
        user = await self.repo.get_user_by_email(data.email.lower())
        if not user:
            raise InvalidCredentialsException()

        if not verify_password(data.password, user.password_hash):
            # Audit failed login
            await self.audit.log_event(
                action="user.login_failed",
                entity_type="user",
                entity_id=str(user.id),
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"reason": "invalid_password"},
            )
            raise InvalidCredentialsException()

        if user.status != "active":
            raise AccountDisabledException()

        # Create tokens and session
        tokens = await self._create_tokens_and_session(
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # Audit log
        await self.audit.log_event(
            action="user.logged_in",
            entity_type="user",
            entity_id=str(user.id),
            actor_user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info("user_logged_in", user_id=str(user.id))

        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=tokens,
        )

    async def logout(
        self,
        user_id: uuid.UUID,
        ip_address: str,
        user_agent: str,
        refresh_token: Optional[str] = None,
    ) -> None:
        """Revoke user session(s)."""
        if refresh_token:
            token_hash = hash_token(refresh_token)
            session = await self.repo.get_session_by_token_hash(token_hash)
            if session:
                await self.repo.revoke_session(session.id)
        else:
            await self.repo.revoke_all_user_sessions(user_id)

        # Audit log
        await self.audit.log_event(
            action="user.logged_out",
            entity_type="user",
            entity_id=str(user_id),
            actor_user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info("user_logged_out", user_id=str(user_id))

    async def get_current_user(self, user_id: uuid.UUID) -> UserResponse:
        """Get current user profile."""
        user = await self.repo.get_user_by_id(user_id)
        if not user:
            raise InvalidCredentialsException()
        return UserResponse.model_validate(user)

    async def _create_tokens_and_session(
        self,
        user_id: uuid.UUID,
        ip_address: str,
        user_agent: str,
    ) -> TokenResponse:
        """Create access + refresh tokens and persist session."""
        settings = get_settings()
        access_token = create_access_token(subject=str(user_id))
        refresh_token = create_refresh_token(subject=str(user_id))

        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

        session = UserSession(
            user_id=user_id,
            refresh_token_hash=hash_token(refresh_token),
            device_info=user_agent[:512] if user_agent else None,
            ip_address=ip_address,
            expires_at=expires_at,
        )
        await self.repo.create_session(session)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

