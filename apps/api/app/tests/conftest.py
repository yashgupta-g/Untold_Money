"""
Pytest configuration and shared fixtures.

Uses httpx AsyncClient with ASGI transport to test the FastAPI app without
a running server.

Database tests (`db_client`) run against a separate `<POSTGRES_DB>_test`
database on the same Postgres server, created and migrated on first use and
emptied after every test. The development database is never touched.
"""

from __future__ import annotations

import asyncio
import importlib
import pkgutil
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.modules as app_modules
from app.core.config import get_settings
from app.core.database import Base, get_async_session
from app.main import app

# Register every model on Base.metadata before create_all.
for _module in pkgutil.iter_modules(app_modules.__path__):
    try:
        importlib.import_module(f"app.modules.{_module.name}.models")
    except ModuleNotFoundError:
        pass

# Limiter off by default; test_rate_limit turns it on for itself.
get_settings().RATE_LIMIT_ENABLED = False


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the test session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client (no database)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def _test_database_url() -> str:
    url = make_url(get_settings().DATABASE_URL)
    return url.set(database=f"{url.database}_test").render_as_string(hide_password=False)


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    test_url = make_url(_test_database_url())

    # Create the test database if this is the first run.
    admin = create_async_engine(
        test_url.set(database="postgres"), poolclass=NullPool, isolation_level="AUTOCOMMIT"
    )
    async with admin.connect() as conn:
        exists = await conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": test_url.database}
        )
        if not exists:
            await conn.execute(text(f'CREATE DATABASE "{test_url.database}"'))
    await admin.dispose()

    engine = create_async_engine(test_url, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def clean_db(test_engine) -> AsyncGenerator[None, None]:
    """
    Empties every table after the test. db_client and db_session both depend
    on it, so it is set up before them and torn down after them: the
    TRUNCATE never waits on a session that is still open.
    """
    yield
    tables = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
    async with test_engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest_asyncio.fixture
async def db_client(test_engine, clean_db) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client whose requests use the test database."""
    factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async def _session() -> AsyncGenerator[AsyncSession, None]:
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_async_session] = _session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.pop(get_async_session, None)


@pytest_asyncio.fixture
async def db_session(test_engine, clean_db) -> AsyncGenerator[AsyncSession, None]:
    """Direct session on the test database, for arranging and asserting state."""
    factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
        await session.rollback()
