"use client";

import { useEffect, useSyncExternalStore } from "react";
import { liveFeed, type LiveSnapshot, type LiveTick } from "@/lib/liveFeed";

/** The whole live snapshot: status, prices, day P&L. */
export function useLiveFeed(): LiveSnapshot {
  return useSyncExternalStore(liveFeed.subscribe, liveFeed.getSnapshot, liveFeed.getServerSnapshot);
}

/**
 * Live prices for `symbols` from the user's broker. Returns an empty map
 * (and `live: false`) when there's no live connection; callers then show
 * their API-loaded price instead.
 */
export function useLivePrices(symbols: string[]): {
  live: boolean;
  provider: string | null;
  prices: Record<string, LiveTick>;
} {
  const key = [...new Set(symbols.filter(Boolean).map((s) => s.toUpperCase()))].sort().join(",");
  useEffect(() => {
    if (!key) return;
    return liveFeed.watch(key.split(","));
  }, [key]);
  const snapshot = useLiveFeed();
  return { live: snapshot.live, provider: snapshot.provider, prices: snapshot.prices };
}

/** A live price if there is one, else the fallback (e.g. from the API). */
export function livePrice(
  prices: Record<string, LiveTick>,
  symbol: string | null | undefined,
  fallback: number | null | undefined
): number | null {
  if (symbol && prices[symbol.toUpperCase()]) return prices[symbol.toUpperCase()].ltp;
  return fallback ?? null;
}
