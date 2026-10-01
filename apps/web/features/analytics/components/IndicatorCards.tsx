"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import type { IndicatorsData } from "@/store/api/marketApi";

const SIGNAL_CONFIG = {
  BULLISH: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: TrendingUp, label: "Bullish" },
  BEARISH: { color: "text-red-500", bg: "bg-red-500/10", icon: TrendingDown, label: "Bearish" },
  NEUTRAL: { color: "text-amber-500", bg: "bg-amber-500/10", icon: Minus, label: "Neutral" },
} as const;

function formatValue(name: string, value: number) {
  if (name === "RSI_14") return value.toFixed(2);
  if (name === "MACD" || name === "MACD_SIGNAL") return value.toFixed(4);
  if (name === "ATR_14") return `₹${value.toFixed(2)}`;
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function displayName(name: string) {
  const map: Record<string, string> = {
    SMA_20: "SMA (20)",
    SMA_50: "SMA (50)",
    EMA_20: "EMA (20)",
    RSI_14: "RSI (14)",
    MACD: "MACD",
    MACD_SIGNAL: "MACD Signal",
    ATR_14: "ATR (14)",
  };
  return map[name] ?? name;
}

interface IndicatorCardsProps {
  data: IndicatorsData | undefined;
  isLoading: boolean;
}

export function IndicatorCards({ data, isLoading }: IndicatorCardsProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-ink" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.indicators.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Info className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">No indicator data available</p>
          <p className="text-xs text-muted-foreground">
            Not enough candle data to compute indicators
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary-ink" />
            Technical Indicators
          </CardTitle>
          {data.computed_at && (
            <span className="text-[10px] text-muted-foreground">
              Updated {new Date(data.computed_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
              })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.indicators.map((indicator) => {
            const signal = SIGNAL_CONFIG[indicator.signal as keyof typeof SIGNAL_CONFIG] ?? SIGNAL_CONFIG.NEUTRAL;
            const SignalIcon = signal.icon;

            return (
              <div
                key={indicator.name}
                className="group relative rounded-xl border border-border/50 bg-card/60 p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-md"
                title={indicator.description}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {displayName(indicator.name)}
                  </p>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="mt-2 text-lg font-bold tabular-nums">
                  {formatValue(indicator.name, indicator.value)}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className={`rounded-md p-1 ${signal.bg}`}>
                    <SignalIcon className={`h-3 w-3 ${signal.color}`} />
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${signal.bg} ${signal.color} border-0`}>
                    {signal.label}
                  </Badge>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                  {indicator.description}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
