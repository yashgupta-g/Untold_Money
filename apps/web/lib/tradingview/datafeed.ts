/**
 * TradingView Advanced Charts datafeed backed by the user's own broker.
 *
 * - History: GET /market-data/{symbol}/candles (the user's Fyers history),
 *   through RTK Query so the access token and silent refresh are reused.
 * - Live: ticks from the app's live feed (lib/liveFeed.ts) update the last
 *   bar, or open a new one when its period has passed.
 * - Symbols: the NSE instrument list (/instruments).
 *
 * Datafeed API: https://www.tradingview.com/charting-library-docs/latest/connecting_data/Datafeed-API
 */

import { liveFeed, type LiveTick } from "@/lib/liveFeed";
import { store } from "@/store";
import { marketApi, type CandleData } from "@/store/api/marketApi";
import type {
  Bar,
  DatafeedConfiguration,
  IBasicDataFeed,
  LibrarySymbolInfo,
  ResolutionString,
} from "./types";

export const SUPPORTED_RESOLUTIONS: ResolutionString[] = ["1", "5", "15", "60", "240", "1D", "1W"];

const INTERVAL: Record<string, string> = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "60": "1h",
  "240": "4h",
  "1D": "1d",
  D: "1d",
  "1W": "1w",
  W: "1w",
};

const MINUTES: Record<string, number> = { "1m": 1, "5m": 5, "15m": 15, "1h": 60, "4h": 240 };

// Stop paging back after this many empty ranges in a row (weekends and
// holidays are empty too, so one empty range isn't the end of history).
const MAX_EMPTY_RANGES = 6;

const CONFIG: DatafeedConfiguration = {
  supported_resolutions: SUPPORTED_RESOLUTIONS,
  exchanges: [{ value: "NSE", name: "NSE", desc: "National Stock Exchange of India" }],
  symbols_types: [
    { name: "Stock", value: "stock" },
    { name: "Index", value: "index" },
  ],
  supports_marks: false,
  supports_timescale_marks: false,
  supports_time: true,
};

async function query<T>(thunk: unknown): Promise<T> {
  // An RTK Query subscription: read the result once, then let it go.
  const sub = store.dispatch(thunk as never) as unknown as {
    unwrap(): Promise<T>;
    unsubscribe(): void;
  };
  try {
    return await sub.unwrap();
  } finally {
    sub.unsubscribe();
  }
}

function errorText(error: unknown): string {
  const e = error as { data?: { message?: string; error_code?: string } };
  return e?.data?.error_code ?? e?.data?.message ?? "Couldn't load market data";
}

function toBar(c: CandleData): Bar {
  return {
    time: new Date(c.candle_time).getTime(),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  };
}

interface Subscription {
  symbol: string;
  interval: string;
  onTick: (bar: Bar) => void;
  stopWatching: () => void;
  stopListening: () => void;
  lastVolume: number | null;
}

/** Same IST calendar day / ISO week, for daily and weekly bars. */
function istKey(ms: number, interval: string): string {
  const d = new Date(ms + 5.5 * 3600_000);
  if (interval === "1d") return d.toISOString().slice(0, 10);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

export function createDatafeed(): IBasicDataFeed {
  const lastBars = new Map<string, Bar>(); // symbol|interval → latest bar sent
  const emptyRuns = new Map<string, number>();
  const subscriptions = new Map<string, Subscription>();

  const applyTick = (sub: Subscription, tick: LiveTick) => {
    const key = `${sub.symbol}|${sub.interval}`;
    const last = lastBars.get(key);
    if (!last) return;
    const now = Date.now();
    const price = tick.ltp;
    // Tick volume is the day's running total; intraday bars get the change.
    const delta = sub.lastVolume == null ? 0 : Math.max(0, tick.volume - sub.lastVolume);
    sub.lastVolume = tick.volume;

    let next: Bar;
    const minutes = MINUTES[sub.interval];
    if (minutes) {
      const period = minutes * 60_000;
      if (now >= last.time + period) {
        const steps = Math.floor((now - last.time) / period);
        next = { time: last.time + steps * period, open: price, high: price, low: price, close: price, volume: delta };
      } else {
        next = {
          ...last,
          high: Math.max(last.high, price),
          low: Math.min(last.low, price),
          close: price,
          volume: (last.volume ?? 0) + delta,
        };
      }
    } else if (istKey(now, sub.interval) !== istKey(last.time, sub.interval)) {
      const start = sub.interval === "1d" ? Date.parse(`${istKey(now, "1d")}T00:00:00+05:30`) : Date.parse(`${istKey(now, "1w")}T00:00:00+05:30`);
      next = { time: start, open: price, high: price, low: price, close: price, volume: sub.interval === "1d" ? tick.volume : delta };
    } else {
      next = {
        ...last,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
        volume: sub.interval === "1d" ? tick.volume : (last.volume ?? 0) + delta,
      };
    }
    lastBars.set(key, next);
    sub.onTick(next);
  };

  return {
    onReady(callback) {
      setTimeout(() => callback(CONFIG), 0);
    },

    searchSymbols(userInput, _exchange, symbolType, onResult) {
      const q = userInput.trim();
      if (!q) return onResult([]);
      query<{ data: { symbol: string; name: string; instrument_type: string }[] }>(
        marketApi.endpoints.searchInstruments.initiate({ q, limit: 30 })
      )
        .then(({ data }) =>
          onResult(
            data
              .map((i) => ({
                symbol: i.symbol,
                full_name: i.symbol,
                description: i.name,
                exchange: "NSE",
                ticker: i.symbol,
                type: i.instrument_type === "INDEX" ? "index" : "stock",
              }))
              .filter((i) => !symbolType || i.type === symbolType)
          )
        )
        .catch(() => onResult([]));
    },

    resolveSymbol(symbolName, onResolve, onError) {
      const symbol = symbolName.replace(/^NSE:/, "").toUpperCase();
      query<{ data: { symbol: string; name: string; instrument_type: string } }>(
        marketApi.endpoints.getInstrumentBySymbol.initiate(symbol)
      )
        .then(({ data }) => {
          const isIndex = data.instrument_type === "INDEX";
          onResolve({
            name: data.symbol,
            ticker: data.symbol,
            full_name: `NSE:${data.symbol}`,
            description: data.name,
            type: isIndex ? "index" : "stock",
            session: "0915-1530",
            timezone: "Asia/Kolkata",
            exchange: "NSE",
            listed_exchange: "NSE",
            format: "price",
            minmov: 1,
            pricescale: 100,
            has_intraday: true,
            has_daily: true,
            has_weekly_and_monthly: true,
            intraday_multipliers: ["1", "5", "15", "60", "240"],
            daily_multipliers: ["1"],
            weekly_multipliers: ["1"],
            supported_resolutions: SUPPORTED_RESOLUTIONS,
            volume_precision: 0,
            data_status: "streaming",
            visible_plots_set: isIndex ? "ohlc" : "ohlcv",
          } satisfies LibrarySymbolInfo);
        })
        .catch(() => onError("unknown_symbol"));
    },

    getBars(symbolInfo, resolution, periodParams, onResult, onError) {
      const interval = INTERVAL[resolution];
      if (!interval) return onError(`Unsupported resolution ${resolution}`);
      const key = `${symbolInfo.name}|${interval}`;
      query<{ data: CandleData[] }>(
        marketApi.endpoints.getCandles.initiate({
          symbol: symbolInfo.name,
          interval,
          start: new Date(periodParams.from * 1000).toISOString(),
          end: new Date(periodParams.to * 1000).toISOString(),
          limit: 5000,
        })
      )
        .then(({ data }) => {
          const bars = data.map(toBar).filter((b) => b.time < periodParams.to * 1000);
          if (!bars.length) {
            const runs = (emptyRuns.get(key) ?? 0) + 1;
            emptyRuns.set(key, runs);
            return onResult([], { noData: runs >= MAX_EMPTY_RANGES });
          }
          emptyRuns.set(key, 0);
          if (periodParams.firstDataRequest) lastBars.set(key, bars[bars.length - 1]);
          onResult(bars, { noData: false });
        })
        .catch((error) => onError(errorText(error)));
    },

    subscribeBars(symbolInfo, resolution, onTick, listenerGuid) {
      const interval = INTERVAL[resolution];
      if (!interval) return;
      const symbol = symbolInfo.name;
      const sub: Subscription = {
        symbol,
        interval,
        onTick,
        lastVolume: null,
        stopWatching: liveFeed.watch([symbol]),
        stopListening: () => {},
      };
      let seen: LiveTick | undefined;
      sub.stopListening = liveFeed.subscribe(() => {
        const tick = liveFeed.getSnapshot().prices[symbol];
        if (tick && tick !== seen) {
          seen = tick;
          applyTick(sub, tick);
        }
      });
      subscriptions.set(listenerGuid, sub);
    },

    unsubscribeBars(listenerGuid) {
      const sub = subscriptions.get(listenerGuid);
      if (!sub) return;
      sub.stopListening();
      sub.stopWatching();
      subscriptions.delete(listenerGuid);
    },
  };
}
