"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  Plus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useGetTradesQuery,
  useGetTradeAnalyticsQuery,
  type TradeFilterParams,
} from "@/store/api/portfolioApi";
import { TradeAnalyticsCards } from "@/features/trades/components/TradeAnalyticsCards";
import { TradeFilters } from "@/features/trades/components/TradeFilters";
import { TradesTable } from "@/features/trades/components/TradesTable";
import { CreateTradeDialog } from "@/features/trades/components/CreateTradeDialog";

export default function TradesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState<TradeFilterParams>({
    limit: 100,
    offset: 0,
  });

  const {
    data: tradesRes,
    isLoading: tradesLoading,
    isError: tradesError,
    refetch: refetchTrades,
  } = useGetTradesQuery(filters);

  const {
    data: analyticsRes,
    isLoading: analyticsLoading,
  } = useGetTradeAnalyticsQuery();

  const trades = tradesRes?.data ?? [];
  const analytics = analyticsRes?.data;

  // Error State
  if (tradesError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade Journal</h1>
          <p className="text-sm text-muted-foreground">
            Track, analyze, and improve your trading performance
          </p>
        </div>
        <div className="flex h-[40vh] flex-col items-center justify-center">
          <div className="rounded-2xl bg-red-500/10 p-4 mb-4">
            <ArrowLeftRight className="h-10 w-10 text-red-500/60" />
          </div>
          <p className="text-lg font-medium">Failed to load trades</p>
          <p className="mt-1 text-sm text-muted-foreground">Something went wrong. Please try again.</p>
          <Button onClick={() => refetchTrades()} variant="outline" className="mt-4 gap-2" size="sm">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trade Journal</h1>
          <p className="text-sm text-muted-foreground">
            Track, analyze, and improve your trading performance
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Log Trade
        </Button>
      </div>

      {/* Analytics Cards */}
      {analytics && !analyticsLoading && (
        <TradeAnalyticsCards analytics={analytics} />
      )}
      {analyticsLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/80 animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted/50" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-16 rounded bg-muted/50" />
                    <div className="h-5 w-24 rounded bg-muted/50" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <TradeFilters filters={filters} onFiltersChange={setFilters} />

      {/* Trades Table */}
      <TradesTable trades={trades} isLoading={tradesLoading} />

      {/* Create Trade Dialog */}
      <CreateTradeDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
}
