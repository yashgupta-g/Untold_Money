"""
Analytics service — computes technical indicators and stock scores
from market candle data using standard financial formulas.

Indicators:
  SMA(20), SMA(50), EMA(20), RSI(14), MACD, MACD Signal, ATR(14)

Scores:
  trend_score, momentum_score, volatility_score, volume_score → final_score
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.modules.analytics.models import StockScore, TechnicalIndicator
from app.modules.analytics.repository import AnalyticsRepository
from app.modules.analytics.schemas import (
    IndicatorsResponse,
    IndicatorValue,
    RecalculateResponse,
    StockScoreResponse,
)
from app.modules.instruments.repository import InstrumentRepository
from app.modules.market_data.repository import MarketDataRepository

logger = get_logger(__name__)

# Minimum candle requirements for each indicator
MIN_CANDLES = {
    "SMA_20": 20,
    "SMA_50": 50,
    "EMA_20": 20,
    "RSI_14": 15,   # Need 14+1 for first diff
    "MACD": 35,     # EMA 26 + 9 signal
    "MACD_SIGNAL": 35,
    "ATR_14": 15,
}

# Human-readable explanations
DESCRIPTIONS = {
    "SMA_20": "20-day Simple Moving Average — short-term trend direction. Price above SMA is bullish.",
    "SMA_50": "50-day Simple Moving Average — medium-term trend. Golden cross (SMA 20 > SMA 50) is bullish.",
    "EMA_20": "20-day Exponential Moving Average — reacts faster to price changes than SMA.",
    "RSI_14": "Relative Strength Index (14) — momentum oscillator. Above 70 is overbought, below 30 is oversold.",
    "MACD": "Moving Average Convergence Divergence — trend momentum. Positive MACD suggests bullish momentum.",
    "MACD_SIGNAL": "MACD Signal Line (9-period EMA of MACD) — crossovers generate buy/sell signals.",
    "ATR_14": "Average True Range (14) — measures volatility. Higher ATR means more price movement.",
}


class AnalyticsService:
    """Technical indicators and stock scoring engine."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = AnalyticsRepository(session)
        self.instrument_repo = InstrumentRepository(session)
        self.market_repo = MarketDataRepository(session)

    # ================================================================
    # INDICATOR CALCULATIONS (pure math, no DB)
    # ================================================================

    @staticmethod
    def _sma(closes: list[float], period: int) -> Optional[float]:
        if len(closes) < period:
            return None
        return round(sum(closes[-period:]) / period, 4)

    @staticmethod
    def _ema(closes: list[float], period: int) -> Optional[float]:
        if len(closes) < period:
            return None
        multiplier = 2 / (period + 1)
        ema = sum(closes[:period]) / period  # seed with SMA
        for price in closes[period:]:
            ema = (price - ema) * multiplier + ema
        return round(ema, 4)

    @staticmethod
    def _rsi(closes: list[float], period: int = 14) -> Optional[float]:
        if len(closes) < period + 1:
            return None
        deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]

        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period

        for i in range(period, len(deltas)):
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period

        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return round(100 - (100 / (1 + rs)), 2)

    @staticmethod
    def _macd(closes: list[float]) -> tuple[Optional[float], Optional[float]]:
        """Returns (macd_line, signal_line)."""
        if len(closes) < 35:
            return None, None

        def ema_seq(data: list[float], period: int) -> list[float]:
            multiplier = 2 / (period + 1)
            ema_val = sum(data[:period]) / period
            result = [ema_val]
            for price in data[period:]:
                ema_val = (price - ema_val) * multiplier + ema_val
                result.append(ema_val)
            return result

        ema12_vals = ema_seq(closes, 12)
        ema26_vals = ema_seq(closes, 26)

        # Align: EMA26 starts at index 26, EMA12 starts at index 12
        # MACD line = EMA12 - EMA26 (aligned by end)
        min_len = min(len(ema12_vals), len(ema26_vals))
        macd_line = [
            ema12_vals[len(ema12_vals) - min_len + i] - ema26_vals[len(ema26_vals) - min_len + i]
            for i in range(min_len)
        ]

        if len(macd_line) < 9:
            return round(macd_line[-1], 4) if macd_line else None, None

        # Signal = 9-period EMA of MACD line
        signal_vals = ema_seq(macd_line, 9)
        return round(macd_line[-1], 4), round(signal_vals[-1], 4)

    @staticmethod
    def _atr(highs: list[float], lows: list[float], closes: list[float], period: int = 14) -> Optional[float]:
        if len(closes) < period + 1:
            return None

        true_ranges = []
        for i in range(1, len(closes)):
            tr = max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i - 1]),
                abs(lows[i] - closes[i - 1]),
            )
            true_ranges.append(tr)

        if len(true_ranges) < period:
            return None

        atr = sum(true_ranges[:period]) / period
        for i in range(period, len(true_ranges)):
            atr = (atr * (period - 1) + true_ranges[i]) / period
        return round(atr, 4)

    # ================================================================
    # COMPUTE ALL INDICATORS FOR A SYMBOL
    # ================================================================

    async def _resolve_instrument(self, symbol: str):
        instrument = await self.instrument_repo.get_instrument_by_symbol(symbol)
        if not instrument:
            raise NotFoundException(f"Instrument '{symbol}' not found")
        return instrument

    async def compute_indicators(
        self, symbol: str
    ) -> IndicatorsResponse:
        """Calculate all indicators from candle data."""
        instrument = await self._resolve_instrument(symbol)

        candles = await self.market_repo.get_candles(
            instrument_id=instrument.id, interval="1d", limit=200
        )

        resp = IndicatorsResponse(
            symbol=symbol.upper(),
            instrument_id=instrument.id,
            candle_count=len(candles),
        )

        if len(candles) < 15:
            return resp  # Not enough data — return empty indicators

        closes = [float(c.close) for c in candles]
        highs = [float(c.high) for c in candles]
        lows = [float(c.low) for c in candles]
        volumes = [int(c.volume) for c in candles]
        last_close = closes[-1]
        now = datetime.now(timezone.utc)

        indicators: list[IndicatorValue] = []
        db_indicators: list[TechnicalIndicator] = []

        def add(name: str, value: Optional[float]):
            if value is None:
                return
            # Determine signal
            signal = "NEUTRAL"
            if name in ("SMA_20", "SMA_50", "EMA_20"):
                signal = "BULLISH" if last_close > value else "BEARISH"
            elif name == "RSI_14":
                if value > 70:
                    signal = "BEARISH"
                elif value < 30:
                    signal = "BULLISH"
                else:
                    signal = "NEUTRAL"
            elif name == "MACD":
                signal = "BULLISH" if value > 0 else "BEARISH"

            iv = IndicatorValue(
                name=name,
                value=round(value, 4),
                signal=signal,
                description=DESCRIPTIONS.get(name, ""),
            )
            indicators.append(iv)
            db_indicators.append(
                TechnicalIndicator(
                    instrument_id=instrument.id,
                    indicator_name=name,
                    indicator_value=round(value, 4),
                    signal=signal,
                    description=DESCRIPTIONS.get(name, ""),
                    computed_at=now,
                )
            )

        # Calculate each indicator
        add("SMA_20", self._sma(closes, 20))
        add("SMA_50", self._sma(closes, 50))
        add("EMA_20", self._ema(closes, 20))
        add("RSI_14", self._rsi(closes, 14))

        macd_val, macd_signal = self._macd(closes)
        add("MACD", macd_val)
        add("MACD_SIGNAL", macd_signal)

        add("ATR_14", self._atr(highs, lows, closes, 14))

        # Persist
        if db_indicators:
            await self.repo.upsert_indicators(instrument.id, db_indicators)

        resp.indicators = indicators
        resp.computed_at = now
        return resp

    # ================================================================
    # STOCK SCORING
    # ================================================================

    async def compute_score(self, symbol: str) -> StockScoreResponse:
        """Compute composite score from indicators."""
        instrument = await self._resolve_instrument(symbol)

        candles = await self.market_repo.get_candles(
            instrument_id=instrument.id, interval="1d", limit=200
        )

        if len(candles) < 20:
            raise NotFoundException(
                f"Not enough data for '{symbol}' — need at least 20 candles, have {len(candles)}"
            )

        closes = [float(c.close) for c in candles]
        highs = [float(c.high) for c in candles]
        lows = [float(c.low) for c in candles]
        volumes = [int(c.volume) for c in candles]
        last_close = closes[-1]
        now = datetime.now(timezone.utc)

        # --- Trend Score (0-100) ---
        # Based on price position relative to SMA 20 & SMA 50
        trend_score = 50.0
        sma20 = self._sma(closes, 20)
        sma50 = self._sma(closes, 50)
        if sma20:
            pct_above_sma20 = ((last_close - sma20) / sma20) * 100
            trend_score += min(max(pct_above_sma20 * 5, -25), 25)
        if sma50:
            pct_above_sma50 = ((last_close - sma50) / sma50) * 100
            trend_score += min(max(pct_above_sma50 * 3, -25), 25)
        trend_score = round(min(max(trend_score, 0), 100), 2)

        # --- Momentum Score (0-100) ---
        # Based on RSI and MACD
        momentum_score = 50.0
        rsi = self._rsi(closes, 14)
        if rsi is not None:
            # Map RSI 30-70 to 0-100 contribution, penalize extremes
            if rsi > 70:
                momentum_score += 15  # Strong momentum but overbought risk
            elif rsi < 30:
                momentum_score -= 15  # Oversold = potential reversal
            else:
                momentum_score += (rsi - 50) * 0.5
        macd_val, macd_sig = self._macd(closes)
        if macd_val is not None and macd_sig is not None:
            if macd_val > macd_sig:
                momentum_score += 15  # Bullish crossover
            else:
                momentum_score -= 10
        momentum_score = round(min(max(momentum_score, 0), 100), 2)

        # --- Volatility Score (0-100) ---
        # Lower ATR relative to price = higher score (less volatile = more stable)
        volatility_score = 50.0
        atr = self._atr(highs, lows, closes, 14)
        if atr and last_close > 0:
            atr_pct = (atr / last_close) * 100
            # ATR% < 1.5 = very low vol (good), > 5 = high vol (risky)
            if atr_pct < 1.5:
                volatility_score = 85
            elif atr_pct < 3:
                volatility_score = 65
            elif atr_pct < 5:
                volatility_score = 45
            else:
                volatility_score = 25
        volatility_score = round(volatility_score, 2)

        # --- Volume Score (0-100) ---
        # Recent volume vs average volume
        volume_score = 50.0
        if len(volumes) >= 20:
            avg_vol = sum(volumes[-20:]) / 20
            recent_vol = sum(volumes[-5:]) / 5
            if avg_vol > 0:
                vol_ratio = recent_vol / avg_vol
                if vol_ratio > 1.5:
                    volume_score = 80  # Strong buying interest
                elif vol_ratio > 1.1:
                    volume_score = 65
                elif vol_ratio > 0.8:
                    volume_score = 50
                else:
                    volume_score = 30  # Declining interest
        volume_score = round(volume_score, 2)

        # --- Final Score (weighted) ---
        final_score = round(
            trend_score * 0.30 +
            momentum_score * 0.30 +
            volatility_score * 0.20 +
            volume_score * 0.20,
            2
        )

        # Signal
        if final_score >= 75:
            signal = "STRONG_BUY"
        elif final_score >= 60:
            signal = "BUY"
        elif final_score >= 40:
            signal = "NEUTRAL"
        elif final_score >= 25:
            signal = "SELL"
        else:
            signal = "STRONG_SELL"

        # Persist
        db_score = StockScore(
            instrument_id=instrument.id,
            trend_score=trend_score,
            momentum_score=momentum_score,
            volatility_score=volatility_score,
            volume_score=volume_score,
            final_score=final_score,
            signal=signal,
            computed_at=now,
        )
        await self.repo.upsert_score(db_score)

        return StockScoreResponse(
            symbol=symbol.upper(),
            instrument_id=instrument.id,
            trend_score=trend_score,
            momentum_score=momentum_score,
            volatility_score=volatility_score,
            volume_score=volume_score,
            final_score=final_score,
            signal=signal,
            computed_at=now,
        )

    # ================================================================
    # READ CACHED INDICATORS / SCORES
    # ================================================================

    async def get_indicators(self, symbol: str) -> IndicatorsResponse:
        """Return cached indicators; if none, compute fresh."""
        instrument = await self._resolve_instrument(symbol)
        cached = await self.repo.get_indicators(instrument.id)
        if cached:
            return IndicatorsResponse(
                symbol=symbol.upper(),
                instrument_id=instrument.id,
                computed_at=cached[0].computed_at if cached else None,
                candle_count=0,
                indicators=[
                    IndicatorValue(
                        name=i.indicator_name,
                        value=float(i.indicator_value),
                        signal=i.signal,
                        description=i.description or DESCRIPTIONS.get(i.indicator_name, ""),
                    )
                    for i in cached
                ],
            )
        # No cache — compute
        return await self.compute_indicators(symbol)

    async def get_score(self, symbol: str) -> StockScoreResponse:
        """Return cached score; if none, compute fresh."""
        instrument = await self._resolve_instrument(symbol)
        cached = await self.repo.get_score(instrument.id)
        if cached:
            return StockScoreResponse(
                symbol=symbol.upper(),
                instrument_id=instrument.id,
                trend_score=float(cached.trend_score),
                momentum_score=float(cached.momentum_score),
                volatility_score=float(cached.volatility_score),
                volume_score=float(cached.volume_score),
                final_score=float(cached.final_score),
                signal=cached.signal,
                computed_at=cached.computed_at,
            )
        return await self.compute_score(symbol)

    # ================================================================
    # RECALCULATE (admin)
    # ================================================================

    async def recalculate(self, symbol: str) -> RecalculateResponse:
        """Force recalculate indicators + score for a symbol."""
        indicators_resp = await self.compute_indicators(symbol)
        score_resp = None
        if indicators_resp.candle_count >= 20:
            score_resp = await self.compute_score(symbol)

        logger.info("analytics_recalculated", symbol=symbol, count=len(indicators_resp.indicators))
        return RecalculateResponse(
            symbol=symbol.upper(),
            instrument_id=indicators_resp.instrument_id,
            indicator_count=len(indicators_resp.indicators),
            score=score_resp,
        )
