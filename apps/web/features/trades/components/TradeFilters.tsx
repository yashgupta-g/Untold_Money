"use client";

import { Search, X, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TradeFilterParams } from "@/store/api/portfolioApi";

const STATUS_OPTIONS = [
  { label: "All", value: undefined },
  { label: "Open", value: "OPEN" },
  { label: "Closed", value: "CLOSED" },
] as const;

const SIDE_OPTIONS = [
  { label: "All", value: undefined },
  { label: "Buy", value: "BUY" },
  { label: "Sell", value: "SELL" },
] as const;

interface TradeFiltersProps {
  filters: TradeFilterParams;
  onFiltersChange: (filters: TradeFilterParams) => void;
}

export function TradeFilters({ filters, onFiltersChange }: TradeFiltersProps) {
  const update = (partial: Partial<TradeFilterParams>) =>
    onFiltersChange({ ...filters, ...partial, offset: 0 });

  const hasActiveFilters =
    filters.symbol ||
    filters.trade_status ||
    filters.trade_side ||
    filters.strategy_tag ||
    filters.date_from ||
    filters.date_to;

  const clearAll = () =>
    onFiltersChange({ limit: 100, offset: 0 });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Symbol Search */}
        <div className="relative w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search symbol..."
            value={filters.symbol ?? ""}
            onChange={(e) => update({ symbol: e.target.value || undefined })}
            className="h-8 bg-muted/50 pl-9 pr-8 text-xs"
          />
          {filters.symbol && (
            <button
              onClick={() => update({ symbol: undefined })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center rounded-lg border border-border/50 bg-card/80 p-0.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => update({ trade_status: opt.value })}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                filters.trade_status === opt.value ||
                (!filters.trade_status && opt.value === undefined)
                  ? "bg-primary/10 text-primary-ink"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Side Filter */}
        <div className="flex items-center rounded-lg border border-border/50 bg-card/80 p-0.5">
          {SIDE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => update({ trade_side: opt.value })}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                filters.trade_side === opt.value ||
                (!filters.trade_side && opt.value === undefined)
                  ? "bg-primary/10 text-primary-ink"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Strategy Tag */}
        <div className="relative w-40">
          <Input
            placeholder="Strategy tag..."
            value={filters.strategy_tag ?? ""}
            onChange={(e) => update({ strategy_tag: e.target.value || undefined })}
            className="h-8 bg-muted/50 text-xs"
          />
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={filters.date_from?.split("T")[0] ?? ""}
            onChange={(e) =>
              update({
                date_from: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              })
            }
            className="h-8 rounded-md border border-border/50 bg-muted/50 px-2 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary/30"
          />
          <span className="text-[10px] text-muted-foreground">to</span>
          <input
            type="date"
            value={filters.date_to?.split("T")[0] ?? ""}
            onChange={(e) =>
              update({
                date_to: e.target.value
                  ? new Date(e.target.value + "T23:59:59").toISOString()
                  : undefined,
              })
            }
            className="h-8 rounded-md border border-border/50 bg-muted/50 px-2 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-[11px] text-muted-foreground"
            onClick={clearAll}
          >
            <X className="h-3 w-3" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
