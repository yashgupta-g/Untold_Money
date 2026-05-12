"""
Celery application configuration.
Broker: Redis channel 1, Result backend: Redis channel 2.
"""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "untoldmoney",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
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

# Auto-discover tasks from worker modules
celery_app.autodiscover_tasks([
    "app.workers.data_jobs",
    "app.workers.alert_jobs",
    "app.workers.ml_jobs",
])

# Beat schedule — periodic tasks
celery_app.conf.beat_schedule = {
    # Example: fetch market data every 5 minutes during market hours
    # "fetch-market-data": {
    #     "task": "app.workers.data_jobs.fetch_market_data",
    #     "schedule": crontab(minute="*/5", hour="9-16", day_of_week="1-5"),
    # },
}
