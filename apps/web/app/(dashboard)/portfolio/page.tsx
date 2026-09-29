"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PieChart,
  Plus,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  MoreHorizontal,
  Trash2,
  Pencil,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetPortfoliosQuery,
  useCreatePortfolioMutation,
  useDeletePortfolioMutation,
  type PortfolioSummary,
} from "@/store/api/portfolioApi";

function PortfolioCard({ portfolio }: { portfolio: PortfolioSummary }) {
  const [deletePortfolio] = useDeletePortfolioMutation();
  const invested = portfolio.total_invested ?? 0;

  return (
    <Link href={`/portfolio/${portfolio.id}`} className="block">
      <Card className="group border-border/50 bg-card/80 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-semibold group-hover:text-primary transition-colors">
                {portfolio.name}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {portfolio.base_currency}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {portfolio.holdings_count ?? 0} holdings
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Invested
            </p>
            <p className="text-xl font-bold tabular-nums">
              ₹{invested.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>

          {portfolio.total_pnl !== null && portfolio.total_pnl !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <div
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  portfolio.total_pnl >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {portfolio.total_pnl >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {portfolio.total_pnl >= 0 ? "+" : ""}
                ₹{Math.abs(portfolio.total_pnl).toLocaleString("en-IN")}
              </div>
              {portfolio.pnl_percent !== null && (
                <span className="text-xs text-muted-foreground">
                  ({portfolio.pnl_percent >= 0 ? "+" : ""}
                  {portfolio.pnl_percent}%)
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function PortfolioPage() {
  const { data: portfoliosRes, isLoading } = useGetPortfoliosQuery();
  const [createPortfolio, { isLoading: isCreating }] = useCreatePortfolioMutation();
  const portfolios = portfoliosRes?.data ?? [];

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createPortfolio({ name: newName.trim() }).unwrap();
      setNewName("");
      setShowCreateForm(false);
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Manage your investment portfolios and holdings
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Portfolio
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="border-primary/20 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="portfolio-name" className="text-xs">
                  Portfolio Name
                </Label>
                <Input
                  id="portfolio-name"
                  placeholder="e.g., Long Term, Swing Trading"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-muted/50"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={isCreating || !newName.trim()}
                size="sm"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading portfolios...
          </p>
        </div>
      ) : portfolios.length === 0 ? (
        /* Empty State */
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <PieChart className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-lg font-medium">No portfolios yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first portfolio to start tracking investments
            </p>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" /> Create Portfolio
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Portfolio Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      )}
    </div>
  );
}
