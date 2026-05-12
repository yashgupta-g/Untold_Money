"use client";

import { PieChart, Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockPortfolios = [
  {
    name: "Long Term Holdings",
    value: "₹8,45,200",
    pnl: "+₹1,23,400",
    pnlPercent: "+17.1%",
    holdings: 8,
    trend: "up" as const,
  },
  {
    name: "Swing Trades",
    value: "₹3,12,480",
    pnl: "+₹28,900",
    pnlPercent: "+10.2%",
    holdings: 4,
    trend: "up" as const,
  },
  {
    name: "Experimental",
    value: "₹88,000",
    pnl: "-₹6,720",
    pnlPercent: "-7.1%",
    holdings: 3,
    trend: "down" as const,
  },
];

const mockHoldings = [
  { symbol: "RELIANCE", name: "Reliance Industries", qty: 10, avg: 2350, current: 2480.5, pnl: "+₹1,305", pnlPct: "+5.6%" },
  { symbol: "TCS", name: "Tata Consultancy", qty: 5, avg: 3500, current: 3650, pnl: "+₹750", pnlPct: "+4.3%" },
  { symbol: "HDFCBANK", name: "HDFC Bank", qty: 20, avg: 1620, current: 1580, pnl: "-₹800", pnlPct: "-2.5%" },
  { symbol: "INFY", name: "Infosys", qty: 15, avg: 1380, current: 1420.75, pnl: "+₹611", pnlPct: "+3.0%" },
  { symbol: "SBIN", name: "State Bank of India", qty: 30, avg: 590, current: 625.8, pnl: "+₹1,074", pnlPct: "+6.1%" },
];

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground">Manage your portfolios and track holdings</p>
        </div>
        <Button className="gap-1.5" id="create-portfolio-btn">
          <Plus className="h-4 w-4" />
          New Portfolio
        </Button>
      </div>

      {/* Portfolio Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockPortfolios.map((portfolio) => (
          <Card key={portfolio.name} className="group cursor-pointer border-border/50 bg-card/80 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{portfolio.name}</p>
                  <p className="mt-1 text-2xl font-bold">{portfolio.value}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className={`flex items-center gap-1 text-sm font-medium ${portfolio.trend === "up" ? "text-chart-2" : "text-destructive"}`}>
                  {portfolio.trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {portfolio.pnl} ({portfolio.pnlPercent})
                </div>
                <Badge variant="secondary" className="text-[10px]">{portfolio.holdings} holdings</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Holdings Table */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">All Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-7 gap-4 border-b border-border/50 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Symbol</span>
              <span>Name</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Avg Price</span>
              <span className="text-right">Current</span>
              <span className="text-right">P&L</span>
              <span className="text-right">P&L %</span>
            </div>
            {mockHoldings.map((h) => (
              <div key={h.symbol} className="grid grid-cols-7 gap-4 rounded-lg py-2.5 text-sm transition-colors hover:bg-muted/30">
                <span className="font-medium">{h.symbol}</span>
                <span className="text-muted-foreground truncate">{h.name}</span>
                <span className="text-right">{h.qty}</span>
                <span className="text-right">₹{h.avg.toLocaleString()}</span>
                <span className="text-right">₹{h.current.toLocaleString()}</span>
                <span className={`text-right font-medium ${h.pnl.startsWith("+") ? "text-chart-2" : "text-destructive"}`}>{h.pnl}</span>
                <span className={`text-right ${h.pnlPct.startsWith("+") ? "text-chart-2" : "text-destructive"}`}>{h.pnlPct}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
