# Database Schema

## Entity Relationship Overview

```
users ──1:N── user_sessions
users ──1:N── user_consents
users ──1:N── portfolios
users ──1:N── audit_logs (actor)

exchanges ──1:N── instruments
instruments ──1:N── market_candles
instruments ──1:N── holdings
instruments ──1:N── trades

portfolios ──1:N── holdings
portfolios ──1:N── trades
```

## Tables

### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default uuid4 |
| full_name | VARCHAR(255) | NOT NULL |
| email | VARCHAR(320) | UNIQUE, NOT NULL, indexed |
| phone | VARCHAR(20) | nullable |
| password_hash | VARCHAR(512) | NOT NULL |
| status | VARCHAR(20) | NOT NULL, default 'active' |
| email_verified | BOOLEAN | NOT NULL, default false |
| role | VARCHAR(20) | NOT NULL, default 'user' |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | nullable |

### user_sessions
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users.id, indexed |
| refresh_token_hash | VARCHAR(512) | NOT NULL |
| device_info | VARCHAR(512) | nullable |
| ip_address | VARCHAR(45) | nullable |
| expires_at | TIMESTAMPTZ | NOT NULL |
| revoked_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | NOT NULL |

### user_consents
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users.id, indexed |
| consent_type | VARCHAR(50) | NOT NULL |
| version | VARCHAR(20) | NOT NULL, default '1.0' |
| accepted | BOOLEAN | NOT NULL |
| ip_address | VARCHAR(45) | nullable |
| user_agent | VARCHAR(512) | nullable |
| created_at | TIMESTAMPTZ | NOT NULL |

### audit_logs
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| actor_user_id | UUID | nullable, indexed |
| action | VARCHAR(100) | NOT NULL, indexed |
| entity_type | VARCHAR(100) | NOT NULL |
| entity_id | VARCHAR(255) | nullable |
| metadata | JSON | nullable |
| ip_address | VARCHAR(45) | nullable |
| user_agent | VARCHAR(512) | nullable |
| details | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL, indexed |

### exchanges
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| code | VARCHAR(20) | UNIQUE, NOT NULL |
| name | VARCHAR(100) | NOT NULL |
| country | VARCHAR(50) | NOT NULL, default 'IN' |

### instruments
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| exchange_id | UUID | FK → exchanges.id, indexed |
| symbol | VARCHAR(50) | NOT NULL, indexed |
| name | VARCHAR(255) | NOT NULL |
| instrument_type | VARCHAR(20) | NOT NULL, default 'EQUITY' |
| isin | VARCHAR(20) | nullable |
| sector | VARCHAR(100) | nullable |
| industry | VARCHAR(100) | nullable |
| currency | VARCHAR(10) | NOT NULL, default 'INR' |
| is_active | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMPTZ | NOT NULL |
| UNIQUE(exchange_id, symbol) |

### market_candles
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| instrument_id | UUID | FK → instruments.id, indexed |
| candle_time | TIMESTAMPTZ | NOT NULL, indexed |
| interval | VARCHAR(10) | NOT NULL |
| open | NUMERIC(18,4) | NOT NULL |
| high | NUMERIC(18,4) | NOT NULL |
| low | NUMERIC(18,4) | NOT NULL |
| close | NUMERIC(18,4) | NOT NULL |
| volume | BIGINT | NOT NULL, default 0 |
| provider | VARCHAR(50) | NOT NULL, default 'manual' |
| created_at | TIMESTAMPTZ | NOT NULL |
| UNIQUE(instrument_id, candle_time, interval, provider) |

> **Note**: This table uses BIGSERIAL PK and is designed for future TimescaleDB hypertable conversion on `candle_time`.

### portfolios
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users.id, indexed |
| name | VARCHAR(100) | NOT NULL |
| base_currency | VARCHAR(10) | NOT NULL, default 'INR' |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | nullable |

### holdings
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| portfolio_id | UUID | FK → portfolios.id, indexed |
| instrument_id | UUID | FK → instruments.id, indexed |
| quantity | NUMERIC(18,4) | NOT NULL |
| average_price | NUMERIC(18,4) | NOT NULL |
| source | VARCHAR(20) | NOT NULL, default 'MANUAL' |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | nullable |
| UNIQUE(portfolio_id, instrument_id) |

### trades
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| portfolio_id | UUID | FK → portfolios.id, indexed |
| instrument_id | UUID | FK → instruments.id, indexed |
| trade_side | VARCHAR(10) | NOT NULL (BUY/SELL) |
| quantity | NUMERIC(18,4) | NOT NULL |
| entry_price | NUMERIC(18,4) | NOT NULL |
| exit_price | NUMERIC(18,4) | nullable |
| stop_loss | NUMERIC(18,4) | nullable |
| target_price | NUMERIC(18,4) | nullable |
| fees | NUMERIC(18,4) | NOT NULL, default 0 |
| trade_status | VARCHAR(20) | NOT NULL, default 'OPEN' |
| strategy_tag | VARCHAR(100) | nullable |
| mistake_tag | VARCHAR(100) | nullable |
| emotion_tag | VARCHAR(50) | nullable |
| notes | TEXT | nullable |
| trade_time | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
