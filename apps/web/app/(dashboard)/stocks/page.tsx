"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass, ArrowUpRight, ArrowDownRight, CircleNotch, ChartBar, ArrowsClockwise } from "@phosphor-icons/react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useGetInstrumentsQuery,
  useGetQuotesQuery,
  type InstrumentDetail,
  type QuoteData,
} from "@/store/api/marketApi";
import { ConnectBrokerPrompt } from "@/components/market/ConnectBrokerPrompt";
import { useBrokerStatus } from "@/hooks/useBrokerStatus";
import { useLivePrices } from "@/hooks/useLivePrices";
import type { LiveTick } from "@/lib/liveFeed";

function StockRow({
  instrument,
  quote: apiQuote,
  tick,
  quoteLoading,
}: {
  instrument: InstrumentDetail;
  quote?: QuoteData;
  tick?: LiveTick;
  quoteLoading: boolean;
}) {
  // A live tick from the user's broker beats the API quote.
  const quote = apiQuote
    ? tick
      ? { ...apiQuote, price: tick.ltp, change: tick.ch, change_percent: tick.chp, volume: tick.volume }
      : apiQuote
    : undefined;
  const isPositive = quote ? quote.change >= 0 : true;

  return (
    <Link href={`/stocks/${instrument.symbol}`} className="block">
      <div className="grid grid-cols-12 items-center gap-4 px-4 py-3.5 text-sm transition-all duration-200 hover:bg-muted/40 group">
        {/* Symbol & Name */}
        <div className="col-span-4 flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-xs font-semibold text-accent-foreground">
            {instrument.symbol.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate group-hover:text-primary-ink transition-colors">{instrument.symbol}</p>
            <p className="text-xs text-muted-foreground truncate">{instrument.name}</p>
          </div>
        </div>

        {/* Sector */}
        <div className="col-span-2 hidden md:block">
          {instrument.sector && (
            <Badge variant="secondary" className="text-[10px] font-normal">
              {instrument.sector}
            </Badge>
          )}
        </div>

        {/* Price */}
        <div className="col-span-2 text-right">
          {quoteLoading ? (
            <div className="flex justify-end">
              <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
            </div>
          ) : quote ? (
            <p className="font-semibold tabular-nums">₹{quote.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </div>

        {/* Change */}
        <div className="col-span-2 text-right">
          {quoteLoading ? (
            <div className="flex justify-end">
              <div className="h-4 w-14 animate-pulse rounded-md bg-muted" />
            </div>
          ) : quote ? (
            <div className={`flex items-center justify-end gap-1 font-medium ${isPositive ? "text-profit" : "text-loss"}`}>
              {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              <span className="tabular-nums">{isPositive ? "+" : ""}{quote.change_percent.toFixed(2)}%</span>
            </div>
          ) : null}
        </div>

        {/* Volume */}
        <div className="col-span-2 hidden lg:block text-right">
          {quoteLoading ? (
            <div className="flex justify-end">
              <div className="h-4 w-14 animate-pulse rounded-md bg-muted" />
            </div>
          ) : quote ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {(quote.volume / 100000).toFixed(1)}L
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function StocksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const query = useDeferredValue(searchQuery.trim());
  const { data: instrumentsRes, isLoading, isFetching, refetch } = useGetInstrumentsQuery({
    q: query,
    limit: 50,
  });

  const instruments = instrumentsRes?.data ?? [];
  const broker = useBrokerStatus();
  // One broker call for every row on screen, then live ticks on top.
  const symbols = instruments.map((i) => i.symbol).sort();
  const quotes = useGetQuotesQuery(symbols, { skip: !broker.connected || symbols.length === 0 });
  const { prices } = useLivePrices(broker.connected ? symbols : []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[32px] font-medium leading-tight tracking-[-0.035em]">Stocks</h1>
          <p className="text-sm text-muted-foreground">
            Search every stock and index listed on NSE
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetch();
            if (broker.connected) quotes.refetch();
          }}
          disabled={isFetching || quotes.isFetching}
          className="gap-2"
        >
          <ArrowsClockwise className={`h-3.5 w-3.5 ${isFetching || quotes.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by symbol or name..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          id="stock-search-input"
        />
      </div>

      {!broker.loading && !broker.connected && (
        <ConnectBrokerPrompt compact expired={broker.expired} />
      )}

      {/* Stock Table */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 border-b border-border/50 px-4 py-3 text-[13px] font-medium text-muted-foreground">
            <span className="col-span-4">Instrument</span>
            <span className="col-span-2 hidden md:block">Sector</span>
            <span className="col-span-2 text-right">Price</span>
            <span className="col-span-2 text-right">Change</span>
            <span className="col-span-2 hidden lg:block text-right">Volume</span>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <CircleNotch className="h-8 w-8 animate-spin text-primary-ink" />
              <p className="mt-3 text-sm text-muted-foreground">Loading instruments...</p>
            </div>
          ) : instruments.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20">
              <ChartBar className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No instruments found</p>
              <p className="text-xs text-muted-foreground">
                {query ? `No results for "${query}"` : "The NSE list is still loading. Try again in a minute."}
              </p>
            </div>
          ) : (
            /* Stock Rows */
            <div className="divide-y divide-border/30">
              {instruments.map((instrument) => (
                <StockRow
                  key={instrument.id}
                  instrument={instrument}
                  quote={quotes.data?.data[instrument.symbol]}
                  tick={prices[instrument.symbol]}
                  quoteLoading={broker.connected && quotes.isLoading}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
