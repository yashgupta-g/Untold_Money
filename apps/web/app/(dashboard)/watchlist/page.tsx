"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Plus } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectBrokerPrompt } from "@/components/market/ConnectBrokerPrompt";
import { SourceLabel } from "@/components/market/SourceLabel";
import { useBrokerStatus } from "@/hooks/useBrokerStatus";
import { useLivePrices } from "@/hooks/useLivePrices";
import type { LiveTick } from "@/lib/liveFeed";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useGetQuotesQuery, type QuoteData } from "@/store/api/marketApi";

// A starter list until saved watchlists ship.
const STARTER = [
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "ITC", name: "ITC" },
  { symbol: "MARUTI", name: "Maruti Suzuki" },
];

const STARTER_SYMBOLS = STARTER.map((s) => s.symbol).sort();

function WatchItem({
  symbol,
  name,
  quote,
  tick,
  isLoading,
}: {
  symbol: string;
  name: string;
  quote?: QuoteData;
  tick?: LiveTick;
  isLoading: boolean;
}) {
  const price = tick?.ltp ?? quote?.price;
  const changePercent = tick?.chp ?? quote?.change_percent ?? 0;
  const up = changePercent >= 0;

  return (
    <Link href={`/stocks/${symbol}`} className="block">
      <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-4">
          <p className="font-medium tracking-[-0.01em]">{symbol}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{name}</p>
          <div className="mt-3 flex items-end justify-between gap-2">
            {isLoading && price == null ? (
              <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-lg font-medium tracking-[-0.01em] tabular-nums">
                {price != null ? rupees(price, 2) : "—"}
              </p>
            )}
            {price != null && (
              <span className={cn("flex items-center gap-1 text-sm font-medium tabular-nums", up ? "text-profit" : "text-loss")}>
                {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {up ? "+" : "−"}
                {Math.abs(changePercent).toFixed(2)}%
              </span>
            )}
          </div>
          {price != null && (
            <SourceLabel className="mt-2" provider={tick ? tick.provider : quote?.provider} live={!!tick} />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function WatchlistPage() {
  const broker = useBrokerStatus();
  const quotes = useGetQuotesQuery(STARTER_SYMBOLS, { skip: !broker.connected });
  const { prices } = useLivePrices(broker.connected ? STARTER_SYMBOLS : []);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-medium leading-tight tracking-[-0.035em]">Watchlist</h1>
          <p className="text-sm text-muted-foreground">
            A starter list for now. Saved watchlists are coming soon.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" disabled title="Coming soon">
          <Plus className="h-4 w-4" />
          Add stock
        </Button>
      </div>

      {!broker.loading && !broker.connected ? (
        <ConnectBrokerPrompt expired={broker.expired} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STARTER.map((item) => (
            <WatchItem
              key={item.symbol}
              {...item}
              quote={quotes.data?.data[item.symbol]}
              tick={prices[item.symbol]}
              isLoading={broker.loading || quotes.isLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
