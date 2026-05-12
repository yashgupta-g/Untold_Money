# UntoldMoney API

FastAPI backend for the UntoldMoney platform.

## Architecture

- **Pattern**: Repository → Service → Router
- **ORM**: SQLAlchemy 2.x (async)
- **Migrations**: Alembic
- **Auth**: JWT (access + refresh tokens)
- **Workers**: Celery + Redis
- **Logging**: structlog

## Local Development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

```bash
pytest
pytest --cov=app
```
