"""
Feature Engineering Engine — extracts ML-ready features from raw OHLCV candle data.

This is the CORE of the ML pipeline. Every feature represents a pattern
that the model can learn from:

Feature Groups:
  1. Price Change Features (5) — recent momentum at different lookbacks
  2. Moving Average Features (6) — trend signals from SMA/EMA crossovers
  3. RSI Features (3) — momentum extremes and divergences
  4. MACD Features (3) — trend momentum crossover signals
  5. Volatility Features (4) — ATR-based risk measures
  6. Volume Features (4) — buying/selling pressure patterns
  7. Pattern Features (3) — candlestick patterns and price structure

Total: ~28 features per data point

Why these features work:
  - Price changes capture momentum (stocks that go up tend to keep going up)
  - MA crossovers capture trend shifts (golden cross = bullish confirmation)
  - RSI captures mean reversion (oversold stocks tend to bounce)
  - MACD captures momentum direction changes
  - ATR captures volatility regimes (low vol → breakout coming)
  - Volume confirms price moves (high volume = conviction)
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd


class FeatureEngine:
    """
    Converts raw OHLCV candle arrays into a feature matrix for ML models.

    Usage:
        engine = FeatureEngine()
        df = engine.build_features(closes, highs, lows, volumes)
        # df has one row per candle, columns = feature names
        # First ~50 rows will have NaN (need lookback warmup)
    """

    @staticmethod
    def build_features(
        closes: list[float],
        highs: list[float],
        lows: list[float],
        volumes: list[float],
    ) -> pd.DataFrame:
        """
        Build feature matrix from OHLCV arrays.
        Returns a DataFrame with one row per candle and ~28 feature columns.
        Early rows will have NaN values (insufficient lookback).
        """
        df = pd.DataFrame({
            "close": closes,
            "high": highs,
            "low": lows,
            "volume": volumes,
        })

        # ============================
        # GROUP 1: Price Change Features
        # "How much has the price moved recently?"
        # ============================
        # Returns over 1, 3, 5, 10, 20 days
        # Positive return = price went up, negative = down
        for period in [1, 3, 5, 10, 20]:
            df[f"return_{period}d"] = df["close"].pct_change(period) * 100

        # ============================
        # GROUP 2: Moving Average Features
        # "Is the stock trending up or down?"
        # ============================
        # SMA (Simple Moving Average) - equal weight to all days
        df["sma_20"] = df["close"].rolling(20).mean()
        df["sma_50"] = df["close"].rolling(50).mean()

        # EMA (Exponential Moving Average) - more weight to recent days
        df["ema_12"] = df["close"].ewm(span=12, adjust=False).mean()
        df["ema_20"] = df["close"].ewm(span=20, adjust=False).mean()

        # Price position relative to MAs (% above/below)
        # If price > SMA → bullish; if price < SMA → bearish
        df["price_vs_sma20"] = ((df["close"] - df["sma_20"]) / df["sma_20"]) * 100
        df["price_vs_sma50"] = ((df["close"] - df["sma_50"]) / df["sma_50"]) * 100

        # Golden/Death Cross signal: SMA20 vs SMA50
        # When SMA20 crosses above SMA50 = "golden cross" = bullish
        df["sma_cross"] = ((df["sma_20"] - df["sma_50"]) / df["sma_50"]) * 100

        # ============================
        # GROUP 3: RSI Features
        # "Is the stock overbought or oversold?"
        # RSI > 70 = overbought (likely to drop)
        # RSI < 30 = oversold (likely to bounce)
        # ============================
        delta = df["close"].diff()
        gain = delta.clip(lower=0)
        loss = (-delta).clip(lower=0)

        avg_gain = gain.rolling(14).mean()
        avg_loss = loss.rolling(14).mean()

        rs = avg_gain / avg_loss.replace(0, np.nan)
        df["rsi_14"] = 100 - (100 / (1 + rs))

        # RSI extremes: how far from neutral (50)
        df["rsi_distance"] = df["rsi_14"] - 50

        # RSI rate of change: is momentum accelerating?
        df["rsi_roc"] = df["rsi_14"].diff(3)

        # ============================
        # GROUP 4: MACD Features
        # "Is bullish/bearish momentum building?"
        # MACD = fast EMA - slow EMA
        # Signal = smoothed MACD
        # Histogram = MACD - Signal (positive = bullish momentum)
        # ============================
        ema_12 = df["close"].ewm(span=12, adjust=False).mean()
        ema_26 = df["close"].ewm(span=26, adjust=False).mean()
        df["macd"] = ema_12 - ema_26
        df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
        df["macd_histogram"] = df["macd"] - df["macd_signal"]

        # ============================
        # GROUP 5: Volatility Features
        # "How risky/volatile is this stock right now?"
        # High volatility = bigger moves = more uncertainty
        # Low volatility often precedes big breakouts
        # ============================
        # True Range — the real range of price movement each day
        prev_close = df["close"].shift(1)
        tr1 = df["high"] - df["low"]               # Current day's range
        tr2 = (df["high"] - prev_close).abs()       # Gap up
        tr3 = (df["low"] - prev_close).abs()        # Gap down
        tr = pd.DataFrame({"a": tr1, "b": tr2, "c": tr3}).max(axis="columns")

        df["atr_14"] = tr.rolling(14).mean()

        # ATR as percentage of price (normalize across stocks)
        df["atr_pct"] = (df["atr_14"] / df["close"]) * 100

        # Bollinger Band width: wider = more volatile
        bb_std = df["close"].rolling(20).std()
        df["bb_width"] = (4 * bb_std / df["sma_20"]) * 100

        # Daily range as % of close
        df["daily_range_pct"] = ((df["high"] - df["low"]) / df["close"]) * 100

        # ============================
        # GROUP 6: Volume Features
        # "Is there conviction behind the price move?"
        # Price up + high volume = strong buying pressure
        # Price up + low volume = weak rally, likely to reverse
        # ============================
        df["volume_sma_20"] = df["volume"].rolling(20).mean()

        # Volume ratio: today's volume vs average
        df["volume_ratio"] = df["volume"] / df["volume_sma_20"].replace(0, np.nan)

        # Recent volume trend: is volume increasing or decreasing?
        df["volume_trend"] = (
            df["volume"].rolling(5).mean() / df["volume_sma_20"].replace(0, np.nan)
        )

        # Price-Volume agreement: price up + volume up = bullish
        df["pv_agreement"] = df["return_1d"] * (df["volume_ratio"] - 1)

        # ============================
        # GROUP 7: Pattern Features
        # "What does the candle structure look like?"
        # ============================
        # Body size as % of close (big candle = strong conviction)
        df["body_pct"] = ((df["close"] - df["close"].shift(1)).abs() / df["close"]) * 100

        # Upper shadow ratio (selling pressure at highs)
        candle_range = (df["high"] - df["low"]).replace(0, np.nan)
        close_or_open = df["close"].combine(df["close"].shift(1), max)
        df["upper_shadow"] = (df["high"] - close_or_open) / candle_range

        # Higher highs / lower lows streak
        df["higher_high"] = (df["high"] > df["high"].shift(1)).astype(int).rolling(5).sum()

        return df

    @staticmethod
    def build_labels(
        closes: list[float],
        horizon: int = 3,
    ) -> pd.Series:
        """
        Create labels for direction prediction.

        For each day, the label is:
          1 = price went UP in the next `horizon` days
          0 = price went DOWN in the next `horizon` days

        The last `horizon` rows will be NaN (we don't know the future yet).
        """
        s = pd.Series(closes)
        future_return = s.shift(-horizon) / s - 1
        labels = (future_return > 0).astype(float)
        # NaN for rows where we don't have future data
        labels.iloc[-horizon:] = np.nan
        return labels

    @staticmethod
    def build_regression_labels(
        closes: list[float],
        horizon: int = 5,
    ) -> pd.Series:
        """
        Create labels for price target prediction (Phase 2).

        For each day, the label is the % change in price over the next `horizon` days.
        """
        s = pd.Series(closes)
        future_return = ((s.shift(-horizon) / s) - 1) * 100
        return future_return

    @staticmethod
    def get_feature_columns() -> list[str]:
        """Return the list of feature column names (excludes raw OHLCV)."""
        return [
            # Price changes
            "return_1d", "return_3d", "return_5d", "return_10d", "return_20d",
            # Moving averages
            "price_vs_sma20", "price_vs_sma50", "sma_cross",
            # RSI
            "rsi_14", "rsi_distance", "rsi_roc",
            # MACD
            "macd", "macd_signal", "macd_histogram",
            # Volatility
            "atr_pct", "bb_width", "daily_range_pct",
            # Volume
            "volume_ratio", "volume_trend", "pv_agreement",
            # Patterns
            "body_pct", "upper_shadow", "higher_high",
        ]
