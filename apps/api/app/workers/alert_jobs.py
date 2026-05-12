"""
Alert background jobs.
Handles price alerts, indicator alerts, and notification dispatch.
"""

from __future__ import annotations

from app.workers.celery_app import celery_app


@celery_app.task(name="alert_jobs.check_price_alerts")
def check_price_alerts() -> dict:
    """
    Evaluate all active price alerts against current market data.
    Placeholder — will be implemented with alert module.
    """
    # TODO: Implement price alert evaluation
    return {"status": "not_implemented", "alerts_checked": 0}


@celery_app.task(name="alert_jobs.send_notification")
def send_notification(user_id: str, channel: str, message: str) -> dict:
    """
    Send notification via specified channel (email, push, in-app).
    Placeholder — will be implemented with notification worker.
    """
    # TODO: Implement notification dispatch
    return {"status": "not_implemented", "user_id": user_id, "channel": channel}
