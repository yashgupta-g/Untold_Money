# UntoldMoney

**AI-powered stock analytics, portfolio management, trade journaling, and decision-support platform for retail investors and active traders.**

> ⚠️ This product is an analytics and decision-support platform. It does not provide financial advice, guaranteed predictions, or buy/sell signals.

---

## Architecture

- **Modular Monolith** — Clean module boundaries, ready for microservice extraction.
- **Backend**: Python · FastAPI · SQLAlchemy 2.x · Alembic · Celery
- **Frontend**: Next.js · TypeScript · Tailwind CSS · shadcn/ui · Redux Toolkit
- **Database**: PostgreSQL (TimescaleDB-ready) · Redis
- **Infrastructure**: Docker · Docker Compose · Nginx (future) · Terraform (future)

## Project Structure

```
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # FastAPI backend
├── services/
│   ├── data-ingestion/
│   ├── analytics-engine/
│   ├── ml-engine/
│   └── notification-worker/
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── terraform/
│   └── deployment/
├── docs/             # Product, architecture, and compliance docs
├── docker-compose.yml
└── .env.example
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.12+ (for local backend dev)

### Run Locally

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your values

# 2. Start all services
docker compose up --build

# 3. Access
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000
# API Docs:  http://localhost:8000/docs
```

### Run Backend Individually

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Run Frontend Individually

```bash
cd apps/web
npm install
npm run dev
```

## API Conventions

- **Prefix**: `/api/v1`
- **Success response**: `{ "success": true, "message": "...", "data": {} }`
- **Error response**: `{ "success": false, "message": "...", "error_code": "..." }`

## Documentation

See [docs/](./docs/) for:
- Product Requirements
- High-Level & Low-Level Design
- Database Schema
- API Contract
- Security & Compliance Plans
- Release Roadmap

## License

Proprietary — All rights reserved.
