"use client";

import { use } from "react";
import { ArrowLeft, BarChart3, TrendingUp, Star, Bell, Info } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stocks">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{symbol}</h1>
              <Badge variant="outline" className="text-chart-2 border-chart-2/30">
                +2.34%
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {symbol} · NSE · Equity
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Star className="h-3.5 w-3.5" />
            Watchlist
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Alert
          </Button>
        </div>
      </div>

      {/* Price Section */}
      <div className="flex items-end gap-4">
        <span className="text-4xl font-bold">₹2,480.50</span>
        <div className="flex items-center gap-1 pb-1 text-chart-2">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">+₹57.25 (+2.34%)</span>
        </div>
        <span className="pb-1 text-xs text-muted-foreground">Last updated: 15:30 IST</span>
      </div>

      {/* Chart & Details */}
      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
          <TabsTrigger value="technicals">Technicals</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Price Chart</CardTitle>
                <div className="flex gap-1">
                  {["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"].map((tf) => (
                    <button
                      key={tf}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        tf === "1D"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Interactive price chart will be rendered here
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    TradingView Lightweight Charts / Recharts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fundamentals">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Market Cap", value: "₹16.8L Cr" },
                  { label: "P/E Ratio", value: "28.5" },
                  { label: "52W High", value: "₹2,856.15" },
                  { label: "52W Low", value: "₹2,180.00" },
                  { label: "Dividend Yield", value: "0.32%" },
                  { label: "Book Value", value: "₹1,142.50" },
                  { label: "EPS", value: "₹87.05" },
                  { label: "Sector", value: "Oil & Gas" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technicals">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "RSI (14)", value: "62.5", signal: "Neutral" },
                  { label: "MACD", value: "15.2", signal: "Bullish" },
                  { label: "SMA 20", value: "₹2,425.30", signal: "Above" },
                  { label: "SMA 50", value: "₹2,380.15", signal: "Above" },
                  { label: "SMA 200", value: "₹2,290.80", signal: "Above" },
                  { label: "Bollinger Band", value: "Upper", signal: "Near Resistance" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <Badge variant="outline" className="text-[10px]">{item.signal}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 rounded-lg bg-primary/5 p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">AI Explanation Layer</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI-generated explanations of computed technical data will appear here.
                    This is not financial advice — AI explains what the data shows, not what
                    you should do with it.
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground/60">
                    Coming in a future release. The AI explanation layer will summarize
                    indicator data, pattern recognition results, and risk metrics in
                    natural language.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
