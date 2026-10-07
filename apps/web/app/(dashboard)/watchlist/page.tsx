"use client";

import { Eye, Plus, TrendUp, TrendDown, DotsThree } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const watchlistItems = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2480.5, change: 1.25, alert: "Near 52W High" },
  { symbol: "TATAMOTORS", name: "Tata Motors", price: 685.4, change: 4.21, alert: "Breakout" },
  { symbol: "ADANIENT", name: "Adani Enterprises", price: 2450.0, change: 3.85, alert: null },
  { symbol: "ITC", name: "ITC Limited", price: 438.2, change: -0.45, alert: "Support Level" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 6780.25, change: -2.14, alert: "Below SMA 50" },
  { symbol: "MARUTI", name: "Maruti Suzuki", price: 12450.0, change: 0.92, alert: null },
];

export default function WatchlistPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
          <p className="text-sm text-muted-foreground">Track stocks you&apos;re interested in</p>
        </div>
        <Button size="sm" className="gap-1.5" id="add-watchlist-btn">
          <Plus className="h-4 w-4" />
          Add Stock
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {watchlistItems.map((item) => (
          <Card key={item.symbol} className="group border-border/50 transition-all hover:border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{item.symbol}</p>
                    {item.alert && <Badge variant="outline" className="text-[10px] border-chart-4/30 text-chart-4">{item.alert}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.name}</p>
                </div>
                <button className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground">
                  <DotsThree className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-lg font-bold">₹{item.price.toLocaleString()}</p>
                <div className={`flex items-center gap-1 text-sm font-medium ${item.change >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  {item.change >= 0 ? <TrendUp className="h-3.5 w-3.5" /> : <TrendDown className="h-3.5 w-3.5" />}
                  {item.change >= 0 ? "+" : ""}{item.change}%
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
