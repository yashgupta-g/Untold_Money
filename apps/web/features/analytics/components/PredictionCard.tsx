"use client";

import { CircleNotch, Sparkle, TrendUp, TrendDown, Target, Brain, ArrowUpRight, ArrowDownRight, Info, ChartBar } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PredictionData, TopSignal } from "@/store/api/marketApi";

function featureLabel(name: string): string {
  const map: Record<string, string> = {
    return_1d: "1-Day Return",
    return_3d: "3-Day Return",
    return_5d: "5-Day Return",
    return_10d: "10-Day Return",
    return_20d: "20-Day Return",
    price_vs_sma20: "Price vs SMA(20)",
    price_vs_sma50: "Price vs SMA(50)",
    sma_cross: "SMA Cross",
    rsi_14: "RSI (14)",
    rsi_distance: "RSI Distance",
    rsi_roc: "RSI Rate of Change",
    macd: "MACD",
    macd_signal: "MACD Signal",
    macd_histogram: "MACD Histogram",
    atr_pct: "ATR %",
    bb_width: "Bollinger Width",
    daily_range_pct: "Daily Range %",
    volume_ratio: "Volume Ratio",
    volume_trend: "Volume Trend",
    pv_agreement: "Price-Volume Agreement",
    body_pct: "Candle Body %",
    upper_shadow: "Upper Shadow",
    higher_high: "Higher Highs",
  };
  return map[name] ?? name;
}

function SignalBar({ signal }: { signal: TopSignal }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{featureLabel(signal.feature)}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono tabular-nums">{signal.value.toFixed(2)}</span>
        <div className="h-1.5 w-16 bg-muted/50 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(signal.importance * 100 * 4, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface PredictionCardProps {
  data: PredictionData | undefined;
  isLoading: boolean;
}

export function PredictionCard({ data, isLoading }: PredictionCardProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <CircleNotch className="h-6 w-6 animate-spin text-primary-ink" />
              <Brain className="absolute -top-1 -right-1 h-3 w-3 text-primary-ink animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground">Training ML model...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (!data.direction && !data.price_target)) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Sparkle className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">ML Prediction Unavailable</p>
          <p className="text-xs text-muted-foreground mt-1">
            Need at least 80 daily candles to train the model
          </p>
        </CardContent>
      </Card>
    );
  }

  const direction = data.direction;
  const priceTarget = data.price_target;

  const isUp = direction?.direction === "UP";
  const dirColor = isUp ? "text-emerald-500" : "text-red-500";
  const dirBg = isUp ? "bg-emerald-500/10" : "bg-red-500/10";
  const DirIcon = isUp ? ArrowUpRight : ArrowDownRight;
  const confPct = direction ? Math.round(direction.confidence * 100) : 0;

  const confLabel =
    confPct >= 65 ? "High" : confPct >= 55 ? "Moderate" : "Low";
  const confColor =
    confPct >= 65
      ? "text-emerald-500 bg-emerald-500/10"
      : confPct >= 55
      ? "text-amber-500 bg-amber-500/10"
      : "text-red-400 bg-red-400/10";

  return (
    <Card className="border-border/50 overflow-hidden">
      {/* Direction accent rule */}
      <div className={`h-0.5 w-full ${isUp ? "bg-primary" : "bg-destructive"}`} />

      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary-ink" />
            AI Prediction
            <Badge variant="secondary" className="text-[9px] ml-1">
              {direction?.model_version ?? "v1.0"}
            </Badge>
          </CardTitle>
          {direction?.predicted_at && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(direction.predicted_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-5">
        {/* Direction Prediction */}
        {direction && (
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            {/* Left: Direction + Confidence */}
            <div
              className={`border border-border/50 p-4 ${dirBg}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {direction.horizon_days}-Day Direction
              </p>
              <div className="mt-2 flex items-center gap-2">
                <DirIcon className={`h-6 w-6 ${dirColor}`} />
                <span className={`text-2xl font-black ${dirColor}`}>
                  {direction.direction}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge className={`text-[10px] ${confColor} border-0`}>
                  {confLabel} Confidence
                </Badge>
                <span className="text-xs font-bold tabular-nums">
                  {confPct}%
                </span>
              </div>
              {direction.model_accuracy > 0 && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Model accuracy: {Math.round(direction.model_accuracy * 100)}%
                  on validation data
                </p>
              )}
            </div>

            {/* Right: Top Signals */}
            <div className="border border-border/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Top Signals
              </p>
              <div className="space-y-2.5">
                {direction.top_signals.slice(0, 4).map((signal) => (
                  <SignalBar key={signal.feature} signal={signal} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Price Target */}
        {priceTarget && (
          <div className="border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-3.5 w-3.5 text-primary-ink" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {priceTarget.horizon_days}-Day Price Target
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Low Target</p>
                <p className="text-lg font-bold tabular-nums text-red-400">
                  ₹{priceTarget.predicted_low.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Expected Change</p>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    priceTarget.predicted_change_pct >= 0
                      ? "text-emerald-500"
                      : "text-red-500"
                  }`}
                >
                  {priceTarget.predicted_change_pct >= 0 ? "+" : ""}
                  {priceTarget.predicted_change_pct.toFixed(2)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">High Target</p>
                <p className="text-lg font-bold tabular-nums text-emerald-400">
                  ₹{priceTarget.predicted_high.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="mt-3 h-2 w-full bg-muted/50 overflow-hidden relative">
              <div
                className="absolute h-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400"
                style={{ width: "100%" }}
              />
              {/* Current price marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-foreground"
                style={{
                  left: `${
                    priceTarget.predicted_high !== priceTarget.predicted_low
                      ? ((priceTarget.current_price - priceTarget.predicted_low) /
                          (priceTarget.predicted_high - priceTarget.predicted_low)) *
                        100
                      : 50
                  }%`,
                }}
              />
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-1">
              Current: ₹{priceTarget.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {/* Explanation */}
        {direction?.explanation && (
          <div className="border border-border p-4">
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-primary-ink mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {direction.explanation}
              </p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[9px] text-muted-foreground/60 text-center">
          ML predictions are based on historical patterns and should not be used as sole investment advice.
          Past performance does not guarantee future results.
        </p>
      </CardContent>
    </Card>
  );
}
