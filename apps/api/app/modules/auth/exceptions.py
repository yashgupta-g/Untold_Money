"""
Auth exceptions — domain-specific authentication errors.
"""

from app.core.exceptions import ConflictException, UnauthorizedException


class InvalidCredentialsException(UnauthorizedException):
    def __init__(self):
        super().__init__(
            message="Invalid email or password",
            error_code="INVALID_CREDENTIALS",
        )


class EmailAlreadyExistsException(ConflictException):
    def __init__(self):
        super().__init__(
            message="An account with this email already exists",
            error_code="EMAIL_ALREADY_EXISTS",
        )


class SessionExpiredException(UnauthorizedException):
    def __init__(self):
        super().__init__(
            message="Session has expired or been revoked",
            error_code="SESSION_EXPIRED",
        )


class AccountDisabledException(UnauthorizedException):
    def __init__(self):
        super().__init__(
            message="Account has been disabled",
            error_code="ACCOUNT_DISABLED",
        )
