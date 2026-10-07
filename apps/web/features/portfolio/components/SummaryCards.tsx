"use client";

import { ArrowUpRight, ArrowDownRight, Wallet, TrendUp, ChartBar, Percent } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import type { PortfolioSummaryData } from "@/store/api/portfolioApi";

function formatINR(value: number) {
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

interface SummaryCardsProps {
  summary: PortfolioSummaryData;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const isPositive = summary.unrealized_pnl >= 0;

  const cards = [
    {
      label: "Total Invested",
      value: `₹${formatINR(summary.total_invested)}`,
      icon: Wallet,
      color: "text-primary-ink",
    },
    {
      label: "Current Value",
      value: `₹${formatINR(summary.total_value)}`,
      icon: TrendUp,
      color: "text-chart-2",
    },
    {
      label: "Unrealized P&L",
      value: `${isPositive ? "+" : ""}₹${formatINR(Math.abs(summary.unrealized_pnl))}`,
      icon: ChartBar,
      color: isPositive ? "text-emerald-500" : "text-red-500",
      bg: isPositive ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "P&L %",
      value: `${isPositive ? "+" : ""}${summary.unrealized_pnl_percent}%`,
      icon: Percent,
      color: isPositive ? "text-emerald-500" : "text-red-500",
      bg: isPositive ? "bg-emerald-500/10" : "bg-red-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="border-border/50 transition-all duration-300 hover:border-primary/20"
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className="border border-border p-3">
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <p className={`text-xl font-bold tabular-nums ${card.color}`}>
                {card.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Top Gainer / Loser Row */}
      {(summary.top_gainer || summary.top_loser) && (
        <div className="col-span-full grid gap-4 sm:grid-cols-2">
          {summary.top_gainer && (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="flex items-center gap-3 p-4">
                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Top Gainer</p>
                  <p className="font-semibold">{summary.top_gainer.symbol}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm font-bold text-emerald-500">
                    +₹{formatINR(summary.top_gainer.pnl)}
                  </p>
                  <p className="text-xs text-emerald-500/80">
                    +{summary.top_gainer.pnl_percent}%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {summary.top_loser && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="flex items-center gap-3 p-4">
                <ArrowDownRight className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Top Loser</p>
                  <p className="font-semibold">{summary.top_loser.symbol}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm font-bold text-red-500">
                    ₹{formatINR(summary.top_loser.pnl)}
                  </p>
                  <p className="text-xs text-red-500/80">
                    {summary.top_loser.pnl_percent}%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
