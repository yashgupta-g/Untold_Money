"use client";

import { useState } from "react";
import { ChartBar, CircleNotch } from "@phosphor-icons/react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ConnectBrokerPrompt } from "@/components/market/ConnectBrokerPrompt";
import { SourceLabel } from "@/components/market/SourceLabel";
import { useLivePrices } from "@/hooks/useLivePrices";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isBrokerRequired, useGetCandlesQuery, type CandleData } from "@/store/api/marketApi";

const INTERVALS = [
  { label: "1m", value: "1m", limit: 180 },
  { label: "5m", value: "5m", limit: 150 },
  { label: "15m", value: "15m", limit: 120 },
  { label: "1h", value: "1h", limit: 120 },
  { label: "1D", value: "1d", limit: 120 },
  { label: "1W", value: "1w", limit: 104 },
];

const INTRADAY = new Set(["1m", "5m", "15m", "1h", "4h"]);

interface Row {
  time: string;
  range: [number, number];
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** One candle: wick from low to high, body from open to close. */
function Candle(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Row;
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload) return null;
  const { open, close, high, low } = payload;
  const span = high - low || 1;
  const at = (v: number) => y + ((high - v) / span) * height;
  const up = close >= open;
  const color = up ? "var(--chart-up)" : "var(--chart-down)";
  const bodyTop = at(Math.max(open, close));
  const bodyHeight = Math.max(1, Math.abs(at(open) - at(close)));
  const body = Math.max(1, width * 0.7);
  const cx = x + width / 2;
  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={cx - body / 2} y={bodyTop} width={body} height={bodyHeight} fill={color} rx={1} />
    </g>
  );
}

function label(c: CandleData, intraday: boolean): string {
  const d = new Date(c.candle_time);
  return intraday
    ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

/**
 * A plain candlestick chart, used until the TradingView Advanced Charts
 * library is installed in public/charting_library/.
 */
export function CandlestickFallback({ symbol }: { symbol: string }) {
  const [interval, setActive] = useState(INTERVALS[4]);
  const { data, isLoading, isFetching, error } = useGetCandlesQuery({
    symbol,
    interval: interval.value,
    limit: interval.limit,
  });
  const { prices } = useLivePrices([symbol]);
  const tick = prices[symbol];

  const candles = data?.data ?? [];
  const intraday = INTRADAY.has(interval.value);
  const rows: Row[] = candles.map((c) => ({
    time: label(c, intraday),
    range: [c.low, c.high],
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
  // The live price moves the last candle.
  if (tick && rows.length) {
    const last = rows[rows.length - 1];
    const high = Math.max(last.high, tick.ltp);
    const low = Math.min(last.low, tick.ltp);
    rows[rows.length - 1] = { ...last, close: tick.ltp, high, low, range: [low, high] };
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full bg-muted p-1" role="tablist" aria-label="Candle interval">
          {INTERVALS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={interval.value === opt.value}
              onClick={() => setActive(opt)}
              className={cn(
                "rounded-full bg-transparent px-3 py-1 text-xs font-medium transition-colors",
                interval.value === opt.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {isFetching && !isLoading && <CircleNotch className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {isBrokerRequired(error) ? (
        <ConnectBrokerPrompt
          expired={(error as { data?: { error_code?: string } })?.data?.error_code === "BROKER_SESSION_EXPIRED"}
        />
      ) : isLoading ? (
        <div className="flex h-[360px] items-center justify-center">
          <CircleNotch className="h-6 w-6 animate-spin text-primary-ink" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-[360px] flex-col items-center justify-center text-muted-foreground">
          <ChartBar className="h-10 w-10 opacity-30" />
          <p className="mt-2 text-sm">No candles for this interval yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={["auto", "auto"]}
              orientation="right"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => rupees(v)}
              width={72}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={({ active, payload }) => {
                const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
                if (!row) return null;
                return (
                  <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-medium">{row.time}</p>
                    <p className="tabular-nums text-muted-foreground">
                      O {rupees(row.open, 2)} · H {rupees(row.high, 2)} · L {rupees(row.low, 2)} · C{" "}
                      <span className="text-foreground">{rupees(row.close, 2)}</span>
                    </p>
                    <p className="tabular-nums text-muted-foreground">Vol {row.volume.toLocaleString("en-IN")}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="range" shape={<Candle />} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {rows.length > 0 && (
        <div className="flex justify-end">
          <SourceLabel provider={candles[0]?.provider} live={!!tick} />
        </div>
      )}
    </div>
  );
}
