FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Copy project definition and install dependencies
# Copy all source first because `pip install -e .` needs the package to exist
COPY pyproject.toml ./
COPY app/ ./app/

RUN pip install --upgrade pip && \
    pip install -e ".[ml]"

# Copy Alembic config (needed for migrations)
COPY alembic.ini ./
COPY alembic/ ./alembic/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
