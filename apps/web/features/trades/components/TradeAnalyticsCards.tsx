"use client";

import { ArrowsLeftRight, Target, TrendUp, Pulse, ChartBar, Lightning, Medal, WarningCircle } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TradeAnalytics } from "@/store/api/portfolioApi";

function formatINR(v: number) {
  return Math.abs(v).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

interface AnalyticsCardsProps {
  analytics: TradeAnalytics;
}

export function TradeAnalyticsCards({ analytics }: AnalyticsCardsProps) {
  const isPnlPositive = analytics.total_pnl >= 0;

  const cards = [
    {
      label: "Total Trades",
      value: analytics.total_trades.toString(),
      sub: `${analytics.open_trades} open · ${analytics.closed_trades} closed`,
      icon: ArrowsLeftRight,
      color: "text-primary-ink",
      bg: "bg-primary/10",
    },
    {
      label: "Win Rate",
      value: `${analytics.win_rate}%`,
      sub: `${analytics.win_count}W / ${analytics.loss_count}L`,
      icon: Target,
      color: analytics.win_rate >= 50 ? "text-emerald-500" : "text-amber-500",
      bg: analytics.win_rate >= 50 ? "bg-emerald-500/10" : "bg-amber-500/10",
    },
    {
      label: "Total P&L",
      value: `${isPnlPositive ? "+" : "-"}₹${formatINR(analytics.total_pnl)}`,
      sub: `Best: +₹${formatINR(analytics.best_trade_pnl)} · Worst: ₹${formatINR(analytics.worst_trade_pnl)}`,
      icon: TrendUp,
      color: isPnlPositive ? "text-emerald-500" : "text-red-500",
      bg: isPnlPositive ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Open Trades",
      value: analytics.open_trades.toString(),
      sub: "Currently active",
      icon: Pulse,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      label: "Profit Factor",
      value: analytics.profit_factor > 0 ? analytics.profit_factor.toFixed(2) : "—",
      sub: "Gross wins / gross losses",
      icon: ChartBar,
      color: analytics.profit_factor >= 1.5 ? "text-emerald-500" : analytics.profit_factor >= 1 ? "text-amber-500" : "text-red-500",
      bg: analytics.profit_factor >= 1.5 ? "bg-emerald-500/10" : analytics.profit_factor >= 1 ? "bg-amber-500/10" : "bg-red-500/10",
    },
    {
      label: "Expectancy",
      value: analytics.expectancy !== 0 ? `₹${formatINR(analytics.expectancy)}` : "—",
      sub: "Expected P&L per trade",
      icon: Lightning,
      color: analytics.expectancy >= 0 ? "text-emerald-500" : "text-red-500",
      bg: analytics.expectancy >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Avg Win",
      value: analytics.avg_win > 0 ? `+₹${formatINR(analytics.avg_win)}` : "—",
      sub: `Avg Loss: ₹${formatINR(analytics.avg_loss)}`,
      icon: Medal,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Closed Trades",
      value: analytics.closed_trades.toString(),
      sub: "Completed trades",
      icon: WarningCircle,
      color: "text-muted-foreground",
      bg: "bg-muted/50",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Primary Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card
            key={card.label}
            className="border-border/50 transition-all duration-300 hover:border-primary/20"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${card.bg} p-2.5 transition-colors`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </p>
                  <p className={`text-lg font-bold tabular-nums leading-tight ${card.color}`}>
                    {card.value}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground truncate">
                {card.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Strategy & Mistake Insights */}
      {(analytics.best_strategy || analytics.worst_strategy || analytics.most_common_mistake) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {analytics.best_strategy && (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Best Strategy
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-500">
                  {analytics.best_strategy.tag}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                    +₹{formatINR(analytics.best_strategy.total_pnl)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {analytics.best_strategy.trade_count} trades · {analytics.best_strategy.win_rate}% WR
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          {analytics.worst_strategy && analytics.worst_strategy.tag !== analytics.best_strategy?.tag && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Worst Strategy
                </p>
                <p className="mt-1 text-sm font-bold text-red-500">
                  {analytics.worst_strategy.tag}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-red-500/10 text-red-600">
                    ₹{formatINR(analytics.worst_strategy.total_pnl)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {analytics.worst_strategy.trade_count} trades · {analytics.worst_strategy.win_rate}% WR
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          {analytics.most_common_mistake && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Most Common Mistake
                </p>
                <p className="mt-1 text-sm font-bold text-amber-600">
                  {analytics.most_common_mistake}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Occurred {analytics.most_common_mistake_count} times
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
