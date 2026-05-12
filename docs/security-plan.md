# Security Plan

## Authentication
- **Method**: JWT (JSON Web Tokens)
- **Access Token**: 30-minute expiry, HS256 signed
- **Refresh Token**: 7-day expiry, stored as SHA-256 hash in DB
- **Password Hashing**: bcrypt with automatic salt

## Authorization (Current & Future)
- **Role field** on User model (user/admin)
- **Future**: RBAC with permissions table
- **Future**: API key authentication for external integrations

## Data Protection
- Passwords: bcrypt hashed (never stored in plaintext)
- Refresh tokens: SHA-256 hashed before DB storage
- Secrets: Environment variables only, never in code
- CORS: Strict allowlist (configurable per environment)

## Audit Trail
All sensitive operations are logged in `audit_logs`:
- user.registered
- user.logged_in
- user.login_failed
- user.logged_out
- user.password_changed (future)
- admin.user_disabled (future)

Each log includes: actor_user_id, action, entity_type, entity_id, ip_address, user_agent, timestamp.

## Consent Management
- Terms of service consent logged at registration
- Privacy policy consent logged at registration
- Consent version tracked for future policy updates
- IP address and user agent recorded with consent

## API Security
- Request validation via Pydantic schemas
- Global exception handling (no stack traces in production)
- Rate limiting (planned via Redis)
- Input sanitization via Pydantic validators
- SQL injection prevention via SQLAlchemy ORM

## Infrastructure Security (Future)
- HTTPS everywhere (TLS 1.2+)
- Database encryption at rest
- Redis AUTH password
- Container security scanning
- Dependency vulnerability scanning (Dependabot/Snyk)
- Secrets management (AWS Secrets Manager / HashiCorp Vault)

## Incident Response (Future)
- Monitoring via structured logging + alerting
- Audit log analysis for anomaly detection
- Account lockout after N failed login attempts
- Session revocation capability (single or all sessions)
