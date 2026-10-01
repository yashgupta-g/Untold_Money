"use client";

import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Target,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statsCards = [
  {
    title: "Portfolio Value",
    value: "₹12,45,680",
    change: "+2.34%",
    trend: "up" as const,
    icon: Wallet,
    description: "Across 3 portfolios",
  },
  {
    title: "Today's P&L",
    value: "+₹8,420",
    change: "+0.68%",
    trend: "up" as const,
    icon: TrendingUp,
    description: "15 holdings active",
  },
  {
    title: "Win Rate",
    value: "68.5%",
    change: "+3.2%",
    trend: "up" as const,
    icon: Target,
    description: "Last 30 days",
  },
  {
    title: "Open Trades",
    value: "7",
    change: "3 profitable",
    trend: "up" as const,
    icon: Activity,
    description: "₹2.1L deployed",
  },
];

const recentTrades = [
  { symbol: "RELIANCE", side: "BUY", qty: 10, price: 2480.5, pnl: "+₹1,250", status: "OPEN" },
  { symbol: "TCS", side: "SELL", qty: 5, price: 3650.0, pnl: "+₹3,420", status: "CLOSED" },
  { symbol: "HDFCBANK", side: "BUY", qty: 20, price: 1580.0, pnl: "-₹640", status: "OPEN" },
  { symbol: "INFY", side: "BUY", qty: 15, price: 1420.75, pnl: "+₹890", status: "OPEN" },
  { symbol: "WIPRO", side: "SELL", qty: 25, price: 445.0, pnl: "+₹2,100", status: "CLOSED" },
];

const topMovers = [
  { symbol: "TATAMOTORS", price: "₹685.40", change: "+4.21%", trend: "up" },
  { symbol: "ADANIENT", price: "₹2,450.00", change: "+3.85%", trend: "up" },
  { symbol: "BAJFINANCE", price: "₹6,780.25", change: "-2.14%", trend: "down" },
  { symbol: "SBIN", price: "₹625.80", change: "+1.92%", trend: "up" },
  { symbol: "SUNPHARMA", price: "₹1,120.50", change: "-1.05%", trend: "down" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your portfolio, trades, and market insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card
            key={stat.title}
            className="group border-border/50 bg-card/80 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                  <stat.icon className="h-4 w-4 text-primary-ink" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    stat.trend === "up" ? "text-chart-2" : "text-destructive"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {stat.change}
                </div>
                <span className="text-xs text-muted-foreground">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Trades */}
        <Card className="lg:col-span-2 border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Trades</CardTitle>
              <Badge variant="secondary" className="text-xs">
                <Zap className="mr-1 h-3 w-3" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* Table header */}
              <div className="grid grid-cols-6 gap-4 border-b border-border/50 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>Symbol</span>
                <span>Side</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Price</span>
                <span className="text-right">P&L</span>
                <span className="text-right">Status</span>
              </div>
              {recentTrades.map((trade, i) => (
                <div
                  key={i}
                  className="grid grid-cols-6 gap-4 rounded-lg py-2.5 text-sm transition-colors hover:bg-muted/30"
                >
                  <span className="font-medium">{trade.symbol}</span>
                  <span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        trade.side === "BUY"
                          ? "border-chart-2/30 text-chart-2"
                          : "border-destructive/30 text-destructive"
                      }`}
                    >
                      {trade.side}
                    </Badge>
                  </span>
                  <span className="text-right text-muted-foreground">{trade.qty}</span>
                  <span className="text-right">₹{trade.price.toLocaleString()}</span>
                  <span
                    className={`text-right font-medium ${
                      trade.pnl.startsWith("+") ? "text-chart-2" : "text-destructive"
                    }`}
                  >
                    {trade.pnl}
                  </span>
                  <span className="text-right">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        trade.status === "OPEN" ? "bg-primary/10 text-primary-ink" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {trade.status}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Movers */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Top Movers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topMovers.map((mover) => (
                <div
                  key={mover.symbol}
                  className="flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-muted/30"
                >
                  <div>
                    <p className="text-sm font-medium">{mover.symbol}</p>
                    <p className="text-xs text-muted-foreground">{mover.price}</p>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm font-medium ${
                      mover.trend === "up" ? "text-chart-2" : "text-destructive"
                    }`}
                  >
                    {mover.trend === "up" ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {mover.change}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart placeholder */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Portfolio Performance</CardTitle>
            <div className="flex gap-1">
              {["1W", "1M", "3M", "6M", "1Y"].map((period) => (
                <button
                  key={period}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    period === "1M"
                      ? "bg-primary/10 text-primary-ink"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20">
            <div className="text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                Portfolio performance chart coming soon
              </p>
              <p className="text-xs text-muted-foreground/60">
                Will use Recharts / TradingView Lightweight Charts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
