"""
Audit service — business logic for creating audit log entries.
"""

from __future__ import annotations

import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditLog
from app.modules.audit.repository import AuditRepository


class AuditService:
    """Audit logging business logic."""

    def __init__(self, session: AsyncSession):
        self.repo = AuditRepository(session)

    async def log_event(
        self,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        actor_user_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
        details: Optional[str] = None,
    ) -> AuditLog:

        log = AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json=metadata,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
        )
        return await self.repo.create_log(log)
