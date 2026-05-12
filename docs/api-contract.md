# API Contract

## Base URL
- Local: `http://localhost:8000/api/v1`
- Production: `https://api.untoldmoney.com/api/v1`

## Response Format

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "message": "Human-readable error",
  "error_code": "MACHINE_READABLE_CODE"
}
```

---

## System Endpoints

### `GET /health`
Health check for load balancers.

### `GET /version`
Application version and environment.

---

## Auth Endpoints

### `POST /api/v1/auth/register`
Register a new user.

**Request:**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "SecureP@ss123",
  "phone": "+919876543210",
  "accept_terms": true,
  "accept_privacy": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "id": "uuid", "full_name": "...", "email": "...", ... },
    "tokens": {
      "access_token": "jwt...",
      "refresh_token": "jwt...",
      "token_type": "bearer",
      "expires_in": 1800
    }
  }
}
```

### `POST /api/v1/auth/login`
Authenticate with email and password.

### `POST /api/v1/auth/logout`
Revoke session. Requires auth header.

### `GET /api/v1/auth/me`
Get current user profile. Requires auth header.

---

## Future Endpoints (Planned)

### Instruments
- `GET /api/v1/instruments` — List/search instruments
- `GET /api/v1/instruments/{id}` — Instrument detail

### Market Data
- `GET /api/v1/market-data/{instrument_id}/candles` — OHLCV data

### Portfolio
- `GET /api/v1/portfolios` — List user portfolios
- `POST /api/v1/portfolios` — Create portfolio
- `GET /api/v1/portfolios/{id}/holdings` — List holdings

### Trades
- `GET /api/v1/trades` — List trades with filters
- `POST /api/v1/trades` — Log new trade
- `PUT /api/v1/trades/{id}` — Update trade

### Alerts
- `GET /api/v1/alerts` — List alerts
- `POST /api/v1/alerts` — Create alert

### Analytics
- `GET /api/v1/analytics/portfolio/{id}` — Portfolio analytics
- `GET /api/v1/analytics/trades` — Trade journal stats
