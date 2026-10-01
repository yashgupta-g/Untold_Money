"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Activity,
  BarChart3,
  Globe,
  Building2,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useGetInstrumentBySymbolQuery,
  useGetQuoteQuery,
  useGetCandlesQuery,
  useGetIndicatorsQuery,
  useGetStockScoreQuery,
  useGetPredictionQuery,
} from "@/store/api/marketApi";
import { IndicatorCards } from "@/features/analytics/components/IndicatorCards";
import { StockScoreCard } from "@/features/analytics/components/StockScoreCard";
import { PredictionCard } from "@/features/analytics/components/PredictionCard";

const INTERVAL_OPTIONS = [
  { label: "1D", value: "1d", limit: 30 },
  { label: "1W", value: "1w", limit: 52 },
  { label: "1H", value: "1h", limit: 200 },
  { label: "15M", value: "15m", limit: 200 },
];

function PriceChart({
  symbol,
  interval,
  limit,
}: {
  symbol: string;
  interval: string;
  limit: number;
}) {
  const { data: candlesRes, isLoading } = useGetCandlesQuery({
    symbol,
    interval,
    limit,
  });
  const candles = candlesRes?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-ink" />
      </div>
    );
  }

  if (candles.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center text-muted-foreground">
        <BarChart3 className="h-10 w-10 opacity-30" />
        <p className="mt-2 text-sm">No candle data available</p>
      </div>
    );
  }

  const chartData = candles.map((c) => ({
    time: new Date(c.candle_time).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
    close: c.close,
    high: c.high,
    low: c.low,
    open: c.open,
    volume: c.volume,
  }));

  const isPositive =
    candles.length >= 2
      ? candles[candles.length - 1].close >= candles[0].close
      : true;

  const color = isPositive ? "#10b981" : "#ef4444";

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
          width={80}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number | string | undefined) => [`₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, "Price"]}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={color}
          strokeWidth={2}
          fill="url(#priceGradient)"
          dot={false}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function StockDetailPage() {
  const params = useParams();
  const symbol = (params.symbol as string)?.toUpperCase() ?? "";
  const [selectedInterval, setSelectedInterval] = useState(INTERVAL_OPTIONS[0]);

  const { data: instrumentRes, isLoading: instrumentLoading } =
    useGetInstrumentBySymbolQuery(symbol, { skip: !symbol });
  const { data: quoteRes, isLoading: quoteLoading } = useGetQuoteQuery(symbol, {
    skip: !symbol,
  });
  const { data: indicatorsRes, isLoading: indicatorsLoading } =
    useGetIndicatorsQuery(symbol, { skip: !symbol });
  const { data: scoreRes, isLoading: scoreLoading } =
    useGetStockScoreQuery(symbol, { skip: !symbol });
  const { data: predictionRes, isLoading: predictionLoading } =
    useGetPredictionQuery(symbol, { skip: !symbol });

  const instrument = instrumentRes?.data;
  const quote = quoteRes?.data;
  const indicators = indicatorsRes?.data;
  const score = scoreRes?.data;
  const prediction = predictionRes?.data;
  const isPositive = quote ? quote.change >= 0 : true;

  if (instrumentLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-ink" />
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-3 text-lg font-medium">Instrument not found</p>
        <Link href="/stocks">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Stocks
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/stocks">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Stocks
        </Button>
      </Link>

      {/* Header Card */}
      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            {/* Left — Symbol Info */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary-ink">
                {symbol.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{symbol}</h1>
                  <Badge variant="secondary" className="text-xs">
                    {instrument.exchange?.code ?? "NSE"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {instrument.instrument_type}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{instrument.name}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {instrument.sector && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {instrument.sector}
                    </span>
                  )}
                  {instrument.industry && (
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" /> {instrument.industry}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> {instrument.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Right — Price & Quote */}
            <div className="text-right">
              {quoteLoading ? (
                <div className="space-y-2">
                  <div className="ml-auto h-8 w-32 animate-pulse rounded bg-muted" />
                  <div className="ml-auto h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              ) : quote ? (
                <>
                  <p className="text-3xl font-bold tabular-nums">
                    ₹{quote.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                  <div className={`mt-1 flex items-center justify-end gap-2 text-sm font-medium ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                    {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <span className="tabular-nums">
                      {isPositive ? "+" : ""}₹{quote.change.toFixed(2)} ({isPositive ? "+" : ""}{quote.change_percent.toFixed(2)}%)
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quote Stats Row */}
      {quote && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Open", value: `₹${quote.open.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
            { label: "High", value: `₹${quote.high.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
            { label: "Low", value: `₹${quote.low.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
            { label: "Volume", value: `${(quote.volume / 100000).toFixed(1)}L` },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/50 bg-card/80">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart Card */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-ink" />
              Price Chart
            </CardTitle>
            <div className="flex gap-1">
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedInterval(opt)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedInterval.value === opt.value
                      ? "bg-primary/10 text-primary-ink"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PriceChart
            symbol={symbol}
            interval={selectedInterval.value}
            limit={selectedInterval.limit}
          />
        </CardContent>
      </Card>

      {/* Technical Indicators */}
      <IndicatorCards data={indicators} isLoading={indicatorsLoading} />

      {/* Stock Score */}
      <StockScoreCard data={score} isLoading={scoreLoading} />

      {/* AI Prediction */}
      <PredictionCard data={prediction} isLoading={predictionLoading} />
    </div>
  );
}
