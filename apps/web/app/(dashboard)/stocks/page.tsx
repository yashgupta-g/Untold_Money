"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
  Filter,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useGetInstrumentsQuery,
  useGetQuoteQuery,
  type InstrumentDetail,
} from "@/store/api/marketApi";

function StockRow({ instrument }: { instrument: InstrumentDetail }) {
  const { data: quoteRes, isLoading: quoteLoading } = useGetQuoteQuery(instrument.symbol);
  const quote = quoteRes?.data;
  const isPositive = quote ? quote.change >= 0 : true;

  return (
    <Link href={`/stocks/${instrument.symbol}`} className="block">
      <div className="grid grid-cols-12 items-center gap-4 rounded-xl px-4 py-3.5 text-sm transition-all duration-200 hover:bg-muted/40 hover:shadow-sm group">
        {/* Symbol & Name */}
        <div className="col-span-4 flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary group-hover:bg-primary/20 transition-colors">
            {instrument.symbol.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate group-hover:text-primary transition-colors">{instrument.symbol}</p>
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
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
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
              <div className="h-4 w-14 animate-pulse rounded bg-muted" />
            </div>
          ) : quote ? (
            <div className={`flex items-center justify-end gap-1 font-medium ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
              {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              <span className="tabular-nums">{isPositive ? "+" : ""}{quote.change_percent.toFixed(2)}%</span>
            </div>
          ) : null}
        </div>

        {/* Volume */}
        <div className="col-span-2 hidden lg:block text-right">
          {quoteLoading ? (
            <div className="flex justify-end">
              <div className="h-4 w-14 animate-pulse rounded bg-muted" />
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
  const { data: instrumentsRes, isLoading, isFetching, refetch } = useGetInstrumentsQuery({
    q: searchQuery,
    limit: 50,
  });

  const instruments = instrumentsRes?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stocks</h1>
          <p className="text-sm text-muted-foreground">
            Browse and search {instruments.length} instruments on NSE
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by symbol or name..."
          className="bg-muted/50 pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          id="stock-search-input"
        />
      </div>

      {/* Stock Table */}
      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 border-b border-border/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="col-span-4">Instrument</span>
            <span className="col-span-2 hidden md:block">Sector</span>
            <span className="col-span-2 text-right">Price</span>
            <span className="col-span-2 text-right">Change</span>
            <span className="col-span-2 hidden lg:block text-right">Volume</span>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Loading instruments...</p>
            </div>
          ) : instruments.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20">
              <BarChart3 className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No instruments found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? `No results for "${searchQuery}"` : "Run mock ingestion to seed data"}
              </p>
            </div>
          ) : (
            /* Stock Rows */
            <div className="divide-y divide-border/30">
              {instruments.map((instrument) => (
                <StockRow key={instrument.id} instrument={instrument} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
