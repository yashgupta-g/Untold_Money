"""
ML Engine — Model training and inference for stock predictions.

Three prediction phases:
  Phase 1: Direction Prediction (XGBoost Classifier)
    - "Will this stock go UP or DOWN in the next N days?"
    - Uses walk-forward validation (train on past, predict future)
    - Returns direction + confidence percentage

  Phase 2: Price Target Prediction (Gradient Boosting Regressor)
    - "What price range should I expect in the next 5 days?"
    - Predicts % change, then converts to absolute price bounds

  Phase 3: Trade Outcome Prediction (Random Forest)
    - "Given current market conditions, what's the win probability?"
    - Uses trade history + current indicators

HOW TRAINING WORKS (Walk-Forward):
  Day 1-100: train set  → learn patterns
  Day 101-120: test set → validate
  Day 121+: predict     → generate real predictions

  This prevents "look-ahead bias" — the model never sees future data
  during training. This is critical for honest accuracy metrics.
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor, RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score

from app.modules.predictions.feature_engine import FeatureEngine


class MLEngine:
    """
    Stateless ML engine — trains and predicts on demand.

    We don't persist models to disk (yet). Instead, we train a fresh model
    each time using the stock's full history. This is fast enough for
    ~200 data points and ensures predictions always use latest data.

    Future optimization: cache trained models with joblib.
    """

    FEATURE_COLS = FeatureEngine.get_feature_columns()
    MODEL_VERSION = "v1.0"
    MIN_TRAIN_SAMPLES = 60  # Need at least 60 clean data points

    # ================================================================
    # PHASE 1: Direction Prediction
    # ================================================================

    @classmethod
    def predict_direction(
        cls,
        closes: list[float],
        highs: list[float],
        lows: list[float],
        volumes: list[float],
        horizon: int = 3,
    ) -> Optional[dict]:
        """
        Train a classifier and predict price direction for next `horizon` days.

        Returns:
            {
                "direction": "UP" or "DOWN",
                "confidence": 0.0-1.0,
                "model_accuracy": 0.0-1.0 (on recent validation data),
                "features": {name: value},       # current feature values
                "top_signals": [...],             # most important features
                "explanation": "human-readable summary",
            }
            or None if not enough data.

        How it works step by step:
          1. Build 23 features from candle data (FeatureEngine)
          2. Create labels: 1=UP, 0=DOWN for each day looking `horizon` days ahead
          3. Drop rows with NaN (early rows + last `horizon` rows)
          4. Split: 80% train, 20% test (time-ordered, no shuffle!)
          5. Train GradientBoostingClassifier
          6. Predict on the LATEST row (today) → get probability
          7. Return direction with confidence
        """
        if len(closes) < 80:
            return None

        # Step 1: Build features
        df = FeatureEngine.build_features(closes, highs, lows, volumes)

        # Step 2: Create labels
        labels = FeatureEngine.build_labels(closes, horizon=horizon)
        df["label"] = labels

        # Step 3: Drop NaN rows
        feature_df = df[cls.FEATURE_COLS + ["label"]].dropna()

        if len(feature_df) < cls.MIN_TRAIN_SAMPLES:
            return None

        X = feature_df[cls.FEATURE_COLS].values
        y = feature_df["label"].values

        # Step 4: Train/Test split — TIME-ORDERED (critical!)
        # We use the last 20% as test, because in time series
        # you can never use future data to predict the past.
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]

        if len(X_train) < 30 or len(X_test) < 5:
            return None

        # Step 5: Train model
        model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=3,
            subsample=0.8,
            random_state=42,
        )
        model.fit(X_train, y_train)

        # Step 6: Evaluate on test set
        test_accuracy = accuracy_score(y_test, model.predict(X_test))

        # Step 7: Predict on the LATEST available features
        # This is the row for "today" — the most recent candle
        latest_features_df = df[cls.FEATURE_COLS].dropna()
        if latest_features_df.empty:
            return None

        latest_row = latest_features_df.iloc[-1:].values
        probabilities = model.predict_proba(latest_row)[0]

        # Class mapping: class 0 = DOWN, class 1 = UP
        classes = model.classes_
        up_idx = list(classes).index(1.0) if 1.0 in classes else -1
        down_idx = list(classes).index(0.0) if 0.0 in classes else -1

        if up_idx == -1 or down_idx == -1:
            return None

        up_prob = probabilities[up_idx]
        down_prob = probabilities[down_idx]

        direction = "UP" if up_prob > down_prob else "DOWN"
        confidence = max(up_prob, down_prob)

        # Feature importances — which features mattered most
        importances = model.feature_importances_
        top_indices = np.argsort(importances)[::-1][:5]
        top_signals = [
            {
                "feature": cls.FEATURE_COLS[i],
                "importance": round(float(importances[i]), 4),
                "value": round(float(latest_features_df.iloc[-1][cls.FEATURE_COLS[i]]), 4),
            }
            for i in top_indices
        ]

        # Current feature snapshot
        features_snapshot = {
            col: round(float(latest_features_df.iloc[-1][col]), 4)
            for col in cls.FEATURE_COLS
            if not pd.isna(latest_features_df.iloc[-1][col])
        }

        # Human-readable explanation
        explanation = cls._generate_explanation(
            direction, confidence, top_signals, horizon, features_snapshot
        )

        return {
            "direction": direction,
            "confidence": round(float(confidence), 4),
            "model_accuracy": round(float(test_accuracy), 4),
            "horizon_days": horizon,
            "features": features_snapshot,
            "top_signals": top_signals,
            "explanation": explanation,
            "model_version": cls.MODEL_VERSION,
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        }

    # ================================================================
    # PHASE 2: Price Target Prediction
    # ================================================================

    @classmethod
    def predict_price_target(
        cls,
        closes: list[float],
        highs: list[float],
        lows: list[float],
        volumes: list[float],
        horizon: int = 5,
    ) -> Optional[dict]:
        """
        Predict expected price range for the next `horizon` days.

        Returns:
            {
                "current_price": float,
                "predicted_change_pct": float,    # expected % change
                "predicted_high": float,           # upper bound
                "predicted_low": float,            # lower bound
                "confidence_interval": float,      # ± range
                "explanation": str,
            }
            or None if not enough data.

        How it works:
          1. Same feature extraction as Phase 1
          2. Label = actual % change in next `horizon` days (regression target)
          3. Train GradientBoostingRegressor
          4. Predict % change for today → convert to price bounds
          5. Use prediction error on test set to build confidence interval
        """
        if len(closes) < 80:
            return None

        df = FeatureEngine.build_features(closes, highs, lows, volumes)
        regression_labels = FeatureEngine.build_regression_labels(closes, horizon=horizon)
        df["target"] = regression_labels

        feature_df = df[cls.FEATURE_COLS + ["target"]].dropna()

        if len(feature_df) < cls.MIN_TRAIN_SAMPLES:
            return None

        X = feature_df[cls.FEATURE_COLS].values
        y = feature_df["target"].values

        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]

        if len(X_train) < 30 or len(X_test) < 5:
            return None

        model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=3,
            subsample=0.8,
            random_state=42,
        )
        model.fit(X_train, y_train)

        # Test set error → confidence interval
        test_predictions = model.predict(X_test)
        errors = np.abs(test_predictions - y_test)
        mae = float(np.mean(errors))
        confidence_interval = float(np.percentile(errors, 80))

        # Predict on latest data
        latest_features_df = df[cls.FEATURE_COLS].dropna()
        if latest_features_df.empty:
            return None

        latest_row = latest_features_df.iloc[-1:].values
        predicted_change = float(model.predict(latest_row)[0])

        current_price = closes[-1]
        predicted_high = current_price * (1 + (predicted_change + confidence_interval) / 100)
        predicted_low = current_price * (1 + (predicted_change - confidence_interval) / 100)

        return {
            "current_price": round(current_price, 2),
            "predicted_change_pct": round(predicted_change, 4),
            "predicted_high": round(predicted_high, 2),
            "predicted_low": round(predicted_low, 2),
            "confidence_interval": round(confidence_interval, 4),
            "mae": round(mae, 4),
            "horizon_days": horizon,
            "model_version": cls.MODEL_VERSION,
            "explanation": (
                f"Based on {len(X_train)} days of historical patterns, "
                f"the model expects a {predicted_change:+.2f}% move over the next {horizon} days. "
                f"Expected range: ₹{predicted_low:,.2f} — ₹{predicted_high:,.2f} "
                f"(±{confidence_interval:.2f}% confidence interval)."
            ),
        }

    # ================================================================
    # PHASE 3: Trade Outcome Prediction
    # ================================================================

    @classmethod
    def predict_trade_outcome(
        cls,
        trade_features: list[dict],
    ) -> Optional[dict]:
        """
        Predict win probability for a trade based on user's past trade data.

        Args:
            trade_features: list of dicts, each with:
              - features: dict of indicator values at trade entry time
              - outcome: 1 (win) or 0 (loss)

        The LAST item in the list is the trade we want to predict for
        (it should NOT have an 'outcome' key).

        Returns:
            {
                "win_probability": float,
                "recommendation": str,
                "explanation": str,
            }
        """
        if len(trade_features) < 15:
            return None

        # Separate historical (with outcomes) from the current trade
        historical = [t for t in trade_features if "outcome" in t]
        current = trade_features[-1] if "outcome" not in trade_features[-1] else None

        if len(historical) < 10 or current is None:
            return None

        # Build feature matrix from historical trades
        feature_keys = sorted(historical[0]["features"].keys())
        X_train = np.array([[t["features"].get(k, 0) for k in feature_keys] for t in historical])
        y_train = np.array([t["outcome"] for t in historical])

        # Handle edge case: all wins or all losses
        if len(np.unique(y_train)) < 2:
            win_rate = float(np.mean(y_train))
            return {
                "win_probability": round(win_rate, 4),
                "recommendation": "INSUFFICIENT_VARIETY",
                "explanation": (
                    f"All {len(historical)} historical trades had the same outcome. "
                    f"Need more diverse trade data for reliable predictions."
                ),
            }

        model = RandomForestClassifier(
            n_estimators=50,
            max_depth=5,
            min_samples_leaf=2,
            random_state=42,
        )
        model.fit(X_train, y_train)

        # Predict on current trade
        X_current = np.array([[current["features"].get(k, 0) for k in feature_keys]])
        probabilities = model.predict_proba(X_current)[0]

        classes = list(model.classes_)
        win_prob = probabilities[classes.index(1)] if 1 in classes else 0.5

        if win_prob >= 0.7:
            recommendation = "HIGH_CONFIDENCE"
        elif win_prob >= 0.5:
            recommendation = "MODERATE"
        else:
            recommendation = "CAUTION"

        return {
            "win_probability": round(float(win_prob), 4),
            "recommendation": recommendation,
            "historical_trades": len(historical),
            "explanation": (
                f"Based on {len(historical)} of your past trades with similar market conditions, "
                f"this trade has a {win_prob:.0%} probability of being profitable. "
                f"Recommendation: {recommendation}."
            ),
        }

    # ================================================================
    # EXPLANATION GENERATOR
    # ================================================================

    @staticmethod
    def _generate_explanation(
        direction: str,
        confidence: float,
        top_signals: list[dict],
        horizon: int,
        features: dict,
    ) -> str:
        """Generate a human-readable explanation of the prediction."""
        parts = []

        # Headline
        conf_label = "high" if confidence > 0.65 else "moderate" if confidence > 0.55 else "low"
        parts.append(
            f"The model predicts {direction} movement over the next {horizon} days "
            f"with {conf_label} confidence ({confidence:.0%})."
        )

        # Key signals
        signal_descriptions = []
        for signal in top_signals[:3]:
            name = signal["feature"]
            value = signal["value"]

            if name == "rsi_14":
                if value > 70:
                    signal_descriptions.append(f"RSI is overbought at {value:.1f}")
                elif value < 30:
                    signal_descriptions.append(f"RSI is oversold at {value:.1f}")
                else:
                    signal_descriptions.append(f"RSI is neutral at {value:.1f}")
            elif name == "price_vs_sma20":
                if value > 0:
                    signal_descriptions.append(f"Price is {value:.1f}% above SMA(20)")
                else:
                    signal_descriptions.append(f"Price is {abs(value):.1f}% below SMA(20)")
            elif name == "macd_histogram":
                if value > 0:
                    signal_descriptions.append("MACD histogram is bullish")
                else:
                    signal_descriptions.append("MACD histogram is bearish")
            elif name == "volume_ratio":
                if value > 1.3:
                    signal_descriptions.append(f"Volume is {value:.1f}x above average")
                elif value < 0.7:
                    signal_descriptions.append(f"Volume is below average ({value:.1f}x)")
            elif "return" in name:
                period = name.split("_")[1]
                signal_descriptions.append(f"{period} return is {value:+.2f}%")

        if signal_descriptions:
            parts.append("Key signals: " + "; ".join(signal_descriptions) + ".")

        return " ".join(parts)
