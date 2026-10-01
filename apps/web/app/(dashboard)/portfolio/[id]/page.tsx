"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CircleNotch, ChartPieSlice, Plus, ArrowsClockwise } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetPortfolioQuery,
  useGetPortfolioSummaryQuery,
  useGetPortfolioAllocationQuery,
} from "@/store/api/portfolioApi";
import { SummaryCards } from "@/features/portfolio/components/SummaryCards";
import { HoldingsTable } from "@/features/portfolio/components/HoldingsTable";
import { AddHoldingForm } from "@/features/portfolio/components/AddHoldingForm";
import { AllocationChart } from "@/features/portfolio/components/AllocationChart";

export default function PortfolioDetailPage() {
  const params = useParams();
  const portfolioId = params.id as string;
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    data: res,
    isLoading,
    isError,
    refetch,
  } = useGetPortfolioQuery(portfolioId, { skip: !portfolioId });

  const { data: summaryRes, isLoading: summaryLoading } =
    useGetPortfolioSummaryQuery(portfolioId, { skip: !portfolioId });

  const { data: allocationRes, isLoading: allocationLoading } =
    useGetPortfolioAllocationQuery(portfolioId, { skip: !portfolioId });

  const portfolio = res?.data;
  const summary = summaryRes?.data;
  const allocation = allocationRes?.data;

  // Loading State
  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-primary/20" />
          <CircleNotch className="absolute inset-0 h-12 w-12 animate-spin text-primary-ink" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Loading portfolio...</p>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <div className="border border-destructive/30 p-4 mb-4">
          <ChartPieSlice className="h-10 w-10 text-red-500/60" />
        </div>
        <p className="text-lg font-medium">Failed to load portfolio</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Something went wrong. Please try again.
        </p>
        <Button onClick={() => refetch()} variant="outline" className="mt-4 gap-2" size="sm">
          <ArrowsClockwise className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  // Not Found State
  if (!portfolio) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <div className="border border-border p-4">
          <ChartPieSlice className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <p className="mt-4 text-lg font-medium">Portfolio not found</p>
        <Link href="/portfolio">
          <Button variant="outline" className="mt-4 gap-2" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back to Portfolios
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link href="/portfolio">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Portfolios
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{portfolio.name}</h1>
            <Badge variant="secondary" className="text-[10px]">
              {portfolio.base_currency}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {portfolio.holdings_count ?? 0} holdings · Created{" "}
            {new Date(portfolio.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Holding
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && !summaryLoading && <SummaryCards summary={summary} />}
      {summaryLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/50 animate-pulse">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 bg-muted/50" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-20 bg-muted/50" />
                    <div className="h-6 w-28 bg-muted/50" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Holding Form */}
      <AddHoldingForm
        portfolioId={portfolioId}
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
      />

      {/* Holdings Table */}
      <HoldingsTable
        holdings={portfolio.holdings ?? []}
        portfolioId={portfolioId}
      />

      {/* Allocation Chart */}
      {allocation && <AllocationChart allocation={allocation} isLoading={allocationLoading} />}
    </div>
  );
}
