"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartLineUp,
  Pulse,
  Target,
  TrendUp,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetQuotesQuery, type QuoteData } from "@/store/api/marketApi";
import { ConnectBrokerPrompt } from "@/components/market/ConnectBrokerPrompt";
import { SourceLabel } from "@/components/market/SourceLabel";
import { useBrokerStatus } from "@/hooks/useBrokerStatus";
import { useLivePrices } from "@/hooks/useLivePrices";
import type { LiveTick } from "@/lib/liveFeed";

// The two main indices and a few of the most traded stocks.
const MARKET = [
  { symbol: "NIFTY50", name: "Nifty 50" },
  { symbol: "NIFTYBANK", name: "Nifty Bank" },
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "INFY", name: "Infosys" },
];
const MARKET_SYMBOLS = MARKET.map((m) => m.symbol).sort();
import {
  useGetPortfoliosQuery,
  useGetTradeStatsQuery,
  useGetTradesQuery,
} from "@/store/api/portfolioApi";
import { percent, rupees, signedRupees } from "@/lib/format";

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

function StatCard({
  title,
  value,
  icon: StatIcon,
  change,
  up,
  description,
  loading,
}: {
  title: string;
  value: string;
  icon: Icon;
  change?: string;
  up?: boolean;
  description: string;
  loading: boolean;
}) {
  return (
    <Card className="group transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-semibold tracking-[-0.02em]">{value}</p>
            )}
          </div>
          <StatIcon className="h-4 w-4 shrink-0 text-primary-ink" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          {change && !loading && (
            <span
              className={`flex items-center gap-0.5 text-xs font-medium ${
                up ? "text-profit" : "text-loss"
              }`}
            >
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {change}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/** One row per stock; each fetches its own quote. */
function MarketRow({
  symbol,
  name,
  quote: apiQuote,
  tick,
  isLoading,
}: {
  symbol: string;
  name: string;
  quote?: QuoteData;
  tick?: LiveTick;
  isLoading: boolean;
}) {
  const quote = apiQuote && tick ? { ...apiQuote, price: tick.ltp, change_percent: tick.chp } : apiQuote;
  const up = (quote?.change_percent ?? 0) >= 0;

  return (
    <Link
      href={`/stocks/${symbol}`}
      className="flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-muted/60"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{symbol}</p>
        <p className="truncate text-xs text-muted-foreground">{name}</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-4 w-20" />
      ) : !quote ? (
        <span className="text-sm text-muted-foreground">—</span>
      ) : (
        <div className="text-right">
          <p className="text-sm font-medium tabular-nums">{rupees(quote.price, 2)}</p>
          <p className={`text-xs font-medium tabular-nums ${up ? "text-profit" : "text-loss"}`}>
            {percent(quote.change_percent)}
          </p>
        </div>
      )}
    </Link>
  );
}

function EmptyState({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-foreground/10 px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button variant="outline" size="sm" render={<Link href={href} />}>
        {cta}
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  const portfolios = useGetPortfoliosQuery();
  const stats = useGetTradeStatsQuery();
  const trades = useGetTradesQuery({ limit: 5 });
  const broker = useBrokerStatus();
  const quotes = useGetQuotesQuery(MARKET_SYMBOLS, { skip: !broker.connected });
  const { prices } = useLivePrices(broker.connected ? MARKET_SYMBOLS : []);

  const list = portfolios.data?.data ?? [];
  const totalValue = list.reduce((sum, p) => sum + (p.total_value ?? 0), 0);
  const totalInvested = list.reduce((sum, p) => sum + (p.total_invested ?? 0), 0);
  const totalPnl = list.reduce((sum, p) => sum + (p.total_pnl ?? 0), 0);
  const pnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const holdings = list.reduce((sum, p) => sum + (p.holdings_count ?? 0), 0);
  const tradeStats = stats.data?.data;
  const recentTrades = trades.data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[32px] font-medium leading-tight tracking-[-0.035em]">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your portfolios, trades and the market, at a glance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Portfolio value"
          value={rupees(totalValue)}
          icon={Wallet}
          description={`Across ${list.length} ${list.length === 1 ? "portfolio" : "portfolios"}`}
          loading={portfolios.isLoading}
        />
        <StatCard
          title="Unrealised P&L"
          value={signedRupees(totalPnl)}
          icon={TrendUp}
          change={totalInvested > 0 ? percent(pnlPercent) : undefined}
          up={totalPnl >= 0}
          description={`${holdings} ${holdings === 1 ? "holding" : "holdings"}`}
          loading={portfolios.isLoading}
        />
        <StatCard
          title="Win rate"
          value={tradeStats && tradeStats.closed_trades > 0 ? `${tradeStats.win_rate.toFixed(1)}%` : "—"}
          icon={Target}
          description={
            tradeStats ? `${tradeStats.closed_trades} closed trades` : "No closed trades yet"
          }
          loading={stats.isLoading}
        />
        <StatCard
          title="Open trades"
          value={String(tradeStats?.open_trades ?? 0)}
          icon={Pulse}
          description={tradeStats ? `Realised P&L ${signedRupees(tradeStats.total_pnl)}` : "—"}
          loading={stats.isLoading}
        />
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent trades */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent trades</CardTitle>
              <Link href="/trades" className="text-[13px] font-medium text-primary-ink hover:underline">
                View journal
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {trades.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : recentTrades.length === 0 ? (
              <EmptyState
                text="No trades yet. Log your first one to start building your journal."
                href="/trades"
                cta="Log a trade"
              />
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[520px] space-y-1">
                  <div className="grid grid-cols-6 gap-4 border-b border-border/50 pb-2 text-[13px] font-medium text-muted-foreground">
                    <span>Symbol</span>
                    <span>Side</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Entry</span>
                    <span className="text-right">P&L</span>
                    <span className="text-right">Status</span>
                  </div>
                  {recentTrades.map((trade) => (
                    <div
                      key={trade.id}
                      className="grid grid-cols-6 items-center gap-4 rounded-lg py-2.5 text-sm transition-colors hover:bg-muted/60"
                    >
                      <span className="font-medium">{trade.symbol ?? "—"}</span>
                      <span>
                        <Badge variant="outline" className="text-[10px]">
                          {trade.trade_side}
                        </Badge>
                      </span>
                      <span className="text-right text-muted-foreground tabular-nums">
                        {trade.quantity}
                      </span>
                      <span className="text-right tabular-nums">{rupees(trade.entry_price, 2)}</span>
                      <span
                        className={`text-right font-medium tabular-nums ${
                          trade.pnl == null
                            ? "text-muted-foreground"
                            : trade.pnl >= 0
                              ? "text-profit"
                              : "text-loss"
                        }`}
                      >
                        {trade.pnl == null ? "—" : signedRupees(trade.pnl)}
                      </span>
                      <span className="text-right">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${
                            trade.trade_status === "OPEN"
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {trade.trade_status === "OPEN" ? "Open" : "Closed"}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Market</CardTitle>
              <Link href="/stocks" className="text-[13px] font-medium text-primary-ink hover:underline">
                All stocks
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {broker.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !broker.connected ? (
              <ConnectBrokerPrompt compact expired={broker.expired} className="py-6 text-center" />
            ) : (
              <>
                <div className="space-y-1">
                  {MARKET.map((m) => (
                    <MarketRow
                      key={m.symbol}
                      symbol={m.symbol}
                      name={m.name}
                      quote={quotes.data?.data[m.symbol]}
                      tick={prices[m.symbol]}
                      isLoading={quotes.isLoading}
                    />
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <SourceLabel provider={Object.values(quotes.data?.data ?? {})[0]?.provider} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Portfolio performance</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 && !portfolios.isLoading ? (
            <EmptyState
              text="Create a portfolio and add holdings to see how it performs."
              href="/portfolio"
              cta="Create a portfolio"
            />
          ) : (
            <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/10 text-center">
              <ChartLineUp className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Performance over time arrives with daily portfolio snapshots.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
