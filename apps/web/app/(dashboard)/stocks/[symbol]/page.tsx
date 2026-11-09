"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, CircleNotch, Pulse, ChartBar, Globe, Buildings, Stack } from "@phosphor-icons/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useGetInstrumentBySymbolQuery,
  useGetQuoteQuery,
  useGetIndicatorsQuery,
  useGetStockScoreQuery,
  useGetPredictionQuery,
} from "@/store/api/marketApi";
import { IndicatorCards } from "@/features/analytics/components/IndicatorCards";
import { StockScoreCard } from "@/features/analytics/components/StockScoreCard";
import { PredictionCard } from "@/features/analytics/components/PredictionCard";
import { SourceLabel } from "@/components/market/SourceLabel";
import { ConnectBrokerPrompt } from "@/components/market/ConnectBrokerPrompt";
import { TradingViewChart } from "@/components/charts/tradingview/TradingViewChart";
import { useBrokerStatus } from "@/hooks/useBrokerStatus";
import { useLivePrices } from "@/hooks/useLivePrices";

export default function StockDetailPage() {
  const params = useParams();
  const symbol = (params.symbol as string)?.toUpperCase() ?? "";
  // Market data and analysis need the user's own broker connection.
  const broker = useBrokerStatus();
  const skipMarket = !symbol || !broker.connected;

  const { data: instrumentRes, isLoading: instrumentLoading } =
    useGetInstrumentBySymbolQuery(symbol, { skip: !symbol });
  const { data: quoteRes, isLoading: quoteLoading } = useGetQuoteQuery(symbol, {
    skip: skipMarket,
  });
  const { data: indicatorsRes, isLoading: indicatorsLoading } =
    useGetIndicatorsQuery(symbol, { skip: skipMarket });
  const { data: scoreRes, isLoading: scoreLoading } =
    useGetStockScoreQuery(symbol, { skip: skipMarket });
  const { data: predictionRes, isLoading: predictionLoading } =
    useGetPredictionQuery(symbol, { skip: skipMarket });

  const instrument = instrumentRes?.data;
  const quote = quoteRes?.data;
  const indicators = indicatorsRes?.data;
  const score = scoreRes?.data;
  const prediction = predictionRes?.data;
  const { prices } = useLivePrices(symbol && broker.connected ? [symbol] : []);
  const tick = prices[symbol];
  // A live tick from the user's broker beats the API quote.
  const price = tick?.ltp ?? quote?.price;
  const change = tick?.ch ?? quote?.change ?? 0;
  const changePercent = tick?.chp ?? quote?.change_percent ?? 0;
  const isPositive = change >= 0;

  if (instrumentLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <CircleNotch className="h-8 w-8 animate-spin text-primary-ink" />
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <ChartBar className="h-12 w-12 text-muted-foreground/30" />
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
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            {/* Left — Symbol Info */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-accent-foreground">
                {symbol.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[32px] font-medium leading-tight tracking-[-0.035em]">{symbol}</h1>
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
                      <Buildings className="h-3 w-3" /> {instrument.sector}
                    </span>
                  )}
                  {instrument.industry && (
                    <span className="flex items-center gap-1">
                      <Stack className="h-3 w-3" /> {instrument.industry}
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
              {!broker.connected ? (
                broker.loading ? null : <ConnectBrokerPrompt compact expired={broker.expired} />
              ) : quoteLoading ? (
                <div className="space-y-2">
                  <div className="ml-auto h-8 w-32 animate-pulse rounded-lg bg-muted" />
                  <div className="ml-auto h-4 w-24 animate-pulse rounded-md bg-muted" />
                </div>
              ) : price != null ? (
                <>
                  <p className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">
                    ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                  <div className={`mt-1 flex items-center justify-end gap-2 text-sm font-medium ${isPositive ? "text-profit" : "text-loss"}`}>
                    {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <span className="tabular-nums">
                      {isPositive ? "+" : "−"}₹{Math.abs(change).toFixed(2)} ({isPositive ? "+" : "−"}{Math.abs(changePercent).toFixed(2)}%)
                    </span>
                  </div>
                  <SourceLabel
                    className="mt-1.5 justify-end"
                    provider={tick ? tick.provider : quote?.provider}
                    live={!!tick}
                  />
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
            <Card key={stat.label} className="border-border/50">
              <CardContent className="p-4">
                <p className="text-[13px] font-medium text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold tracking-[-0.01em] tabular-nums">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart: TradingView Advanced Charts on the user's broker data */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Pulse className="h-4 w-4 text-primary-ink" />
            Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          {broker.loading ? (
            <div className="flex h-[360px] items-center justify-center">
              <CircleNotch className="h-6 w-6 animate-spin text-primary-ink" />
            </div>
          ) : (
            <TradingViewChart symbol={symbol} connected={broker.connected} expired={broker.expired} />
          )}
        </CardContent>
      </Card>

      {/* Analysis is computed from the user's broker candles */}
      {broker.connected && (
        <>
          <IndicatorCards data={indicators} isLoading={indicatorsLoading} />
          <StockScoreCard data={score} isLoading={scoreLoading} />
          <PredictionCard data={prediction} isLoading={predictionLoading} />
        </>
      )}
    </div>
  );
}
