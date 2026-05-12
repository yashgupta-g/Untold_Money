"""
ML/AI background jobs.
Handles model training, prediction generation, and LLM explanation requests.
"""

from __future__ import annotations

from app.workers.celery_app import celery_app


@celery_app.task(name="ml_jobs.generate_prediction")
def generate_prediction(instrument_id: str, model_name: str = "baseline") -> dict:
    """
    Generate price prediction for an instrument using specified model.
    Placeholder — will be implemented in future ML phase.
    """
    # TODO: Implement with scikit-learn / XGBoost
    return {"status": "not_implemented", "instrument_id": instrument_id, "model": model_name}


@celery_app.task(name="ml_jobs.train_model")
def train_model(model_name: str, config: dict | None = None) -> dict:
    """
    Train or retrain an ML model.
    Placeholder — will be implemented with MLflow tracking.
    """
    # TODO: Implement model training pipeline
    return {"status": "not_implemented", "model": model_name}


@celery_app.task(name="ml_jobs.generate_ai_explanation")
def generate_ai_explanation(
    instrument_id: str,
    context_type: str = "technical",
) -> dict:
    """
    Generate AI explanation for computed data (indicators, patterns).
    Placeholder — will be implemented with LLM explanation layer.
    """
    # TODO: Implement LLM explanation
    return {"status": "not_implemented", "instrument_id": instrument_id}
