"use client";

import { CircleNotch, Gauge, TrendUp, Lightning, ShieldCheck, ChartBar } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StockScoreData } from "@/store/api/marketApi";

const SIGNAL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  STRONG_BUY: { label: "Strong Buy", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  BUY: { label: "Buy", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  NEUTRAL: { label: "Neutral", color: "text-amber-500", bg: "bg-amber-500/10" },
  SELL: { label: "Sell", color: "text-red-400", bg: "bg-red-400/10" },
  STRONG_SELL: { label: "Strong Sell", color: "text-red-500", bg: "bg-red-500/10" },
};

function ScoreBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const color =
    value >= 70 ? "bg-emerald-500" :
    value >= 50 ? "bg-emerald-400" :
    value >= 40 ? "bg-amber-500" :
    value >= 25 ? "bg-red-400" : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </div>
        <span className="text-xs font-bold tabular-nums">{value}/100</span>
      </div>
      <div className="h-2 w-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

interface StockScoreCardProps {
  data: StockScoreData | undefined;
  isLoading: boolean;
}

export function StockScoreCard({ data, isLoading }: StockScoreCardProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <CircleNotch className="h-6 w-6 animate-spin text-primary-ink" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Gauge className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">Score not available</p>
          <p className="text-xs text-muted-foreground">
            Not enough data to compute a stock score
          </p>
        </CardContent>
      </Card>
    );
  }

  const signalConfig = SIGNAL_LABELS[data.signal ?? "NEUTRAL"] ?? SIGNAL_LABELS.NEUTRAL;
  const scoreColor =
    data.final_score >= 70 ? "text-emerald-500" :
    data.final_score >= 50 ? "text-emerald-400" :
    data.final_score >= 40 ? "text-amber-500" : "text-red-500";

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary-ink" />
          Stock Score
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          {/* Score Circle */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-32 w-32 items-center justify-center border border-border">
              <div className="text-center">
                <p className={`text-3xl font-black tabular-nums ${scoreColor}`}>
                  {data.final_score}
                </p>
                <p className="text-[10px] text-muted-foreground">/100</p>
              </div>
            </div>
            <Badge className={`mt-3 ${signalConfig.bg} ${signalConfig.color} border-0 text-xs font-semibold`}>
              {signalConfig.label}
            </Badge>
            {data.computed_at && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {new Date(data.computed_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short",
                })}
              </p>
            )}
          </div>

          {/* Sub-scores */}
          <div className="space-y-4">
            <ScoreBar label="Trend" value={data.trend_score} icon={TrendUp} />
            <ScoreBar label="Momentum" value={data.momentum_score} icon={Lightning} />
            <ScoreBar label="Volatility" value={data.volatility_score} icon={ShieldCheck} />
            <ScoreBar label="Volume" value={data.volume_score} icon={ChartBar} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
