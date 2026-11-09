"""
Celery application configuration.
Broker: Redis channel 1, Result backend: Redis channel 2.

Settings are loaded lazily to prevent import-time DB/Redis connections.
"""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab
from celery.signals import worker_ready

# Create Celery app with placeholder URLs — actual config is loaded lazily
celery_app = Celery("untoldmoney")


def _configure_celery() -> None:
    """Load settings and apply to Celery app. Called once on first worker start."""
    from app.core.config import get_settings

    settings = get_settings()

    celery_app.conf.update(
        broker_url=settings.CELERY_BROKER_URL,
        result_backend=settings.CELERY_RESULT_BACKEND,
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_acks_late=True,
        worker_prefetch_multiplier=1,
        task_soft_time_limit=300,  # 5 min soft limit
        task_time_limit=600,       # 10 min hard limit
    )


# Configure on import for workers (they import this module directly)
_configure_celery()

# Auto-discover tasks from worker modules
celery_app.autodiscover_tasks([
    "app.workers.data_jobs",
    "app.workers.alert_jobs",
    "app.workers.ml_jobs",
    "app.workers.paper_jobs",
])

# Beat schedule — periodic tasks (times are UTC; IST = UTC+5:30)
celery_app.conf.beat_schedule = {
    # New listings from the NSE symbol master: Sundays, 08:30 IST. Prices
    # and candles aren't stored; they come live from each user's broker.
    "sync-instruments-weekly": {
        "task": "data_jobs.sync_instruments",
        "schedule": crontab(minute=0, hour=3, day_of_week="sun"),
    },
    # Resting paper limit orders, every 5 minutes through the NSE session
    # (09:15–15:30 IST is 03:45–10:00 UTC).
    "match-paper-orders": {
        "task": "paper_jobs.match_open_orders",
        "schedule": crontab(minute="*/5", hour="3-10", day_of_week="mon-fri"),
    },
}


@worker_ready.connect
def _seed_empty_database(sender, **_kwargs) -> None:
    """
    A fresh install knows no stocks until the first weekly run. Load the NSE
    symbol master straight away when the table is (nearly) empty; the task
    itself is idempotent.
    """
    from sqlalchemy import create_engine, text

    from app.core.config import get_settings

    sync_url = get_settings().DATABASE_URL.replace("+asyncpg", "+psycopg2")
    try:
        engine = create_engine(sync_url, pool_pre_ping=True)
        with engine.connect() as conn:
            count = conn.execute(text("SELECT count(*) FROM instruments")).scalar()
        engine.dispose()
    except Exception:
        # No sync driver or DB not ready: queue it anyway; the task decides.
        count = 0
    if (count or 0) < 500:
        sender.app.send_task("data_jobs.sync_instruments")
