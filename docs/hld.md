# High-Level Design (HLD)

## Architecture: Modular Monolith

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Next.js Web  │  │ Mobile (fut) │  │ API Clients  │   │
│  └──────┬───────┘  └──────────────┘  └──────────────┘   │
│         │                                                │
├─────────┼────────────────────────────────────────────────┤
│         │          API Gateway / Nginx                    │
├─────────┼────────────────────────────────────────────────┤
│         ▼                                                │
│  ┌──────────────────────────────────────────────────┐    │
│  │              FastAPI Application                   │    │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐ │    │
│  │  │  Auth  │ │ Users  │ │Instruments│ │ Market  │ │    │
│  │  │ Module │ │ Module │ │  Module   │ │  Data   │ │    │
│  │  └────────┘ └────────┘ └──────────┘ └─────────┘ │    │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐ │    │
│  │  │Portfol│ │ Trades │ │Analytics │ │   AI    │ │    │
│  │  │  io    │ │ Module │ │  Module  │ │Insights │ │    │
│  │  └────────┘ └────────┘ └──────────┘ └─────────┘ │    │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐             │    │
│  │  │ Alerts │ │Billing │ │  Admin   │             │    │
│  │  │ Module │ │ Module │ │  Module  │             │    │
│  │  └────────┘ └────────┘ └──────────┘             │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                   Background Workers                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │Data Ingestion│  │ Alert Worker │  │  ML Pipeline   │  │
│  │   Worker     │  │              │  │    Worker      │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │           │
│         └────────┬───────┴───────────────────┘           │
│                  ▼                                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │           Celery + Redis Broker                    │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                    Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  PostgreSQL   │  │    Redis     │  │   MLflow     │   │
│  │ (TimescaleDB) │  │  Cache/Queue │  │  (future)    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Design Principles

1. **Modular Monolith First**: Each module has clear boundaries (router/service/repository). Can be extracted to microservices when needed.

2. **Clean Architecture**: Business logic lives in services, not routers. Repositories abstract database access.

3. **API-First**: All features exposed via REST API. Frontend consumes the same API that external clients would.

4. **Event-Ready**: Audit logs capture all significant events. Future: event bus for inter-module communication.

5. **Data Provider Abstraction**: Market data fetching is abstracted behind provider interfaces. Swap providers without changing business logic.

## Technology Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Backend | FastAPI | Async, fast, auto-docs, Python ML ecosystem |
| Frontend | Next.js | SSR/SSG, React ecosystem, TypeScript |
| Database | PostgreSQL | ACID, JSON support, TimescaleDB extension |
| Cache | Redis | Fast, versatile (cache + queue + pub/sub) |
| Workers | Celery | Mature, Redis broker, periodic tasks |
| Auth | JWT | Stateless, scalable, standard |
| Charts | Recharts/TradingView | Lightweight, financial-grade |

## Scalability Path

1. **Phase 1**: Single server, Docker Compose
2. **Phase 2**: Horizontal API scaling, read replicas
3. **Phase 3**: Extract hot modules to microservices
4. **Phase 4**: Kubernetes, service mesh
