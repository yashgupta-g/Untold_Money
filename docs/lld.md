# Low-Level Design (LLD)

## Module Architecture Pattern

Every business module follows:
```
module/
├── router.py      # HTTP endpoints (thin layer)
├── service.py     # Business logic
├── repository.py  # Database queries
├── schemas.py     # Pydantic request/response models
├── models.py      # SQLAlchemy ORM models
└── exceptions.py  # Module-specific exceptions
```

## Authentication Flow

### Registration
1. Client sends `POST /api/v1/auth/register` with user data + consent flags
2. Router validates via Pydantic schema
3. Service checks email uniqueness
4. Service hashes password (bcrypt)
5. Service creates User record
6. Service creates UserConsent records (terms + privacy)
7. Service creates access + refresh tokens
8. Service creates UserSession (stores refresh token hash)
9. Service creates AuditLog entry (user.registered)
10. Response: user data + tokens

### Login
1. Client sends `POST /api/v1/auth/login` with credentials
2. Service looks up user by email
3. Service verifies password hash
4. Service checks user status (active/disabled)
5. Service creates new access + refresh tokens
6. Service creates new UserSession
7. Service creates AuditLog entry (user.logged_in)
8. On failure: AuditLog entry (user.login_failed)

### Token Refresh (Future)
1. Client sends refresh token
2. Service validates refresh token
3. Service checks session (not revoked, not expired)
4. Service issues new access token
5. Optionally rotates refresh token

### Logout
1. Client sends `POST /api/v1/auth/logout` with optional refresh token
2. Service revokes specific session or all sessions
3. Service creates AuditLog entry (user.logged_out)

## Database Connection Management
- Async engine with connection pooling (pool_size=10, max_overflow=20)
- Connection pre-ping for stale connection detection
- Session-per-request pattern via FastAPI dependency injection
- Auto-commit on success, rollback on exception

## JWT Token Structure
```json
// Access Token
{
  "sub": "user-uuid",
  "exp": 1234567890,
  "iat": 1234567890,
  "type": "access"
}

// Refresh Token
{
  "sub": "user-uuid",
  "exp": 1234567890,
  "iat": 1234567890,
  "type": "refresh",
  "jti": "unique-token-id"
}
```

## Error Handling Hierarchy
```
Exception
└── AppException (base)
    ├── NotFoundException (404)
    ├── UnauthorizedException (401)
    ├── ForbiddenException (403)
    ├── ConflictException (409)
    ├── BadRequestException (400)
    └── RateLimitException (429)
```

## Logging Strategy
- Structured logging via `structlog`
- JSON output in production (machine-parseable)
- Console output in development (human-readable)
- Contextual fields: user_id, request_id, module
- Log levels: DEBUG (dev), INFO (staging), WARNING (prod)
