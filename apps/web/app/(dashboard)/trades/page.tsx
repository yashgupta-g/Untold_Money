"use client";

import { Plus, Filter, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockTrades = [
  { id: 1, symbol: "RELIANCE", side: "BUY", qty: 10, entry: 2420, exit: 2480, status: "CLOSED", pnl: "+₹600", strategy: "Breakout", emotion: "Confident", date: "2026-05-10" },
  { id: 2, symbol: "TCS", side: "SELL", qty: 5, entry: 3700, exit: 3650, status: "CLOSED", pnl: "+₹250", strategy: "Mean Reversion", emotion: "Calm", date: "2026-05-09" },
  { id: 3, symbol: "HDFCBANK", side: "BUY", qty: 20, entry: 1580, exit: null, status: "OPEN", pnl: "—", strategy: "Momentum", emotion: "Anxious", date: "2026-05-08" },
  { id: 4, symbol: "INFY", side: "BUY", qty: 15, entry: 1400, exit: 1420, status: "CLOSED", pnl: "+₹300", strategy: "Support Bounce", emotion: "Confident", date: "2026-05-07" },
  { id: 5, symbol: "TATAMOTORS", side: "BUY", qty: 25, entry: 660, exit: null, status: "OPEN", pnl: "—", strategy: "Trend Follow", emotion: "Calm", date: "2026-05-06" },
  { id: 6, symbol: "WIPRO", side: "SELL", qty: 30, entry: 460, exit: 445, status: "CLOSED", pnl: "+₹450", strategy: "Breakdown", emotion: "Fearful", date: "2026-05-05" },
  { id: 7, symbol: "BAJFINANCE", side: "BUY", qty: 3, entry: 6900, exit: 6780, status: "CLOSED", pnl: "-₹360", strategy: "FOMO", emotion: "Greedy", date: "2026-05-04" },
];

export default function TradesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade Journal</h1>
          <p className="text-sm text-muted-foreground">Log, tag, and analyze your trades</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" className="gap-1.5" id="add-trade-btn">
            <Plus className="h-4 w-4" />
            Log Trade
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Trades", value: "42", sub: "This month" },
          { label: "Win Rate", value: "68.5%", sub: "28 winners" },
          { label: "Total P&L", value: "+₹12,840", sub: "+4.2% return" },
          { label: "Avg R:R", value: "1:2.3", sub: "Risk/Reward" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50 bg-card/80">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trades Table */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">All Trades</CardTitle>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-9 gap-3 border-b border-border/50 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Date</span>
              <span>Symbol</span>
              <span>Side</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Entry</span>
              <span className="text-right">Exit</span>
              <span className="text-right">P&L</span>
              <span>Strategy</span>
              <span>Emotion</span>
            </div>
            {mockTrades.map((t) => (
              <div key={t.id} className="grid grid-cols-9 gap-3 rounded-lg py-2.5 text-sm transition-colors hover:bg-muted/30 cursor-pointer">
                <span className="text-muted-foreground">{t.date}</span>
                <span className="font-medium">{t.symbol}</span>
                <span>
                  <Badge variant="outline" className={`text-[10px] ${t.side === "BUY" ? "border-chart-2/30 text-chart-2" : "border-destructive/30 text-destructive"}`}>
                    {t.side}
                  </Badge>
                </span>
                <span className="text-right">{t.qty}</span>
                <span className="text-right">₹{t.entry.toLocaleString()}</span>
                <span className="text-right">{t.exit ? `₹${t.exit.toLocaleString()}` : "—"}</span>
                <span className={`text-right font-medium ${t.pnl.startsWith("+") ? "text-chart-2" : t.pnl.startsWith("-") ? "text-destructive" : "text-muted-foreground"}`}>
                  {t.pnl}
                </span>
                <span><Badge variant="secondary" className="text-[10px]">{t.strategy}</Badge></span>
                <span><Badge variant="outline" className="text-[10px]">{t.emotion}</Badge></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
