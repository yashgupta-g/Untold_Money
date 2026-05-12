"""
Auth models — re-exports from users module for convenience.
Auth-specific models (if any) would live here.
"""

from app.modules.users.models import User, UserConsent, UserSession

__all__ = ["User", "UserConsent", "UserSession"]
