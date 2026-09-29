"""
Audit repository — data access layer for audit log entries.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditLog


class AuditRepository:
    """Data access for audit log operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_log(self, log: AuditLog) -> AuditLog:
        self.session.add(log)
        await self.session.flush()
        return log
