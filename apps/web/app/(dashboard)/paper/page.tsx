"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowCounterClockwise, CircleNotch, Flask, X } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { percent, rupees, signedRupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConnectBrokerPrompt } from "@/components/market/ConnectBrokerPrompt";
import { SourceLabel } from "@/components/market/SourceLabel";
import { useBrokerStatus } from "@/hooks/useBrokerStatus";
import { useLivePrices } from "@/hooks/useLivePrices";
import { isBrokerRequired, useGetInstrumentsQuery, useGetQuoteQuery } from "@/store/api/marketApi";
import {
  useCancelPaperOrderMutation,
  useCreatePaperAccountMutation,
  useGetPaperAccountsQuery,
  useGetPaperOrdersQuery,
  usePlacePaperOrderMutation,
  useResetPaperAccountMutation,
  type OrderSide,
  type OrderType,
  type PaperAccount,
  type PaperOrder,
} from "@/store/api/tradingApi";

const STARTING_CASH = [
  { label: "₹1 lakh", value: 100_000 },
  { label: "₹10 lakh", value: 1_000_000 },
  { label: "₹1 crore", value: 10_000_000 },
];

function errorMessage(error: unknown, fallback: string): string {
  return (error as { data?: { message?: string } })?.data?.message ?? fallback;
}

/** Pill segmented control, as on the landing page and tabs. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col auto-cols-fr rounded-full bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 rounded-full bg-transparent text-[13.5px] font-medium text-muted-foreground transition-[background-color,color,box-shadow]",
            value === o.value && "bg-card text-foreground shadow-[0_1px_2px_rgba(11,11,12,0.06),0_2px_8px_-2px_rgba(11,11,12,0.08)]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div className="space-y-1">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold tracking-[-0.02em]",
          tone === "gain" && "text-profit",
          tone === "loss" && "text-loss"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CreateAccount() {
  const [cash, setCash] = useState(1_000_000);
  const [create, { isLoading }] = useCreatePaperAccountMutation();

  const onCreate = async () => {
    try {
      await create({ name: "Practice account", starting_cash: cash }).unwrap();
      toast.success("Paper account ready. Place your first practice order.");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't create the account. Please try again."));
    }
  };

  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="space-y-6 p-8 text-center">
        <Flask className="mx-auto h-8 w-8 text-primary-ink" />
        <div className="space-y-2">
          <h2 className="text-[22px] font-medium tracking-[-0.02em]">Open a practice account</h2>
          <p className="text-sm text-pretty text-muted-foreground">
            Trade NSE stocks with virtual money at real market prices. Test ideas and
            strategies, and review every fill in your journal, without risking a rupee.
          </p>
        </div>
        <div className="space-y-2 text-left">
          <p className="text-[13px] font-medium text-muted-foreground">Starting cash</p>
          <Segmented
            label="Starting cash"
            value={String(cash)}
            options={STARTING_CASH.map((o) => ({ value: String(o.value), label: o.label }))}
            onChange={(v) => setCash(Number(v))}
          />
        </div>
        <Button size="lg" className="w-full" onClick={onCreate} disabled={isLoading}>
          {isLoading && <CircleNotch className="animate-spin" />}
          {isLoading ? "Opening account" : "Open practice account"}
        </Button>
      </CardContent>
    </Card>
  );
}

function OrderTicket({ account }: { account: PaperAccount }) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<OrderSide>("BUY");
  const [type, setType] = useState<OrderType>("MARKET");
  const [quantity, setQuantity] = useState("1");
  const [limit, setLimit] = useState("");
  const [tag, setTag] = useState("");
  const [result, setResult] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const cleanSymbol = symbol.trim().toUpperCase();
  // Suggestions from all ~2,900 NSE listings, matched as you type.
  const { data: instruments } = useGetInstrumentsQuery({ q: cleanSymbol, limit: 20 });
  const broker = useBrokerStatus();
  const { data: quote, isFetching: quoting, error: quoteError } = useGetQuoteQuery(cleanSymbol, {
    skip: cleanSymbol.length < 2 || !broker.connected,
  });
  const [place, { isLoading }] = usePlacePaperOrderMutation();

  // Only known symbols are streamed, not every half-typed one.
  const { prices } = useLivePrices(quote?.data ? [cleanSymbol] : []);
  const tick = prices[cleanSymbol];
  const lastPrice = tick?.ltp ?? quote?.data?.price;
  const changePercent = tick?.chp ?? quote?.data?.change_percent ?? 0;

  const qty = Number(quantity) || 0;
  const price = type === "LIMIT" ? Number(limit) || 0 : lastPrice ?? 0;
  const estimate = price * qty;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setResult(null);
    try {
      const response = await place({
        accountId: account.id,
        symbol: cleanSymbol,
        side,
        order_type: type,
        quantity: qty,
        limit_price: type === "LIMIT" ? Number(limit) : undefined,
        strategy_tag: tag.trim() || undefined,
      }).unwrap();
      const order = response.data;
      if (order.status === "REJECTED") {
        setResult({ tone: "error", text: order.reject_reason ?? "Order rejected" });
      } else if (order.status === "FILLED") {
        setResult({
          tone: "ok",
          text: `${order.side === "BUY" ? "Bought" : "Sold"} ${order.quantity} ${order.symbol} at ${rupees(order.fill_price ?? 0, 2)}`,
        });
      } else {
        setResult({ tone: "ok", text: `Limit order placed. It fills when ${order.symbol} reaches ${rupees(order.limit_price ?? 0, 2)}.` });
      }
    } catch (error) {
      setResult({ tone: "error", text: errorMessage(error, "Couldn't place the order. Please try again.") });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base font-semibold">Place an order</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Segmented
            label="Side"
            value={side}
            options={[
              { value: "BUY", label: "Buy" },
              { value: "SELL", label: "Sell" },
            ]}
            onChange={setSide}
          />

          <div className="space-y-1.5">
            <Label htmlFor="paper-symbol">Stock</Label>
            <Input
              id="paper-symbol"
              list="paper-symbols"
              placeholder="RELIANCE"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
            />
            <datalist id="paper-symbols">
              {(instruments?.data ?? []).map((i) => (
                <option key={i.symbol} value={i.symbol}>
                  {i.name}
                </option>
              ))}
            </datalist>
            {!broker.loading && !broker.connected ? (
              <ConnectBrokerPrompt compact expired={broker.expired} />
            ) : cleanSymbol.length >= 2 && (
              <p className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted-foreground">
                {quoting && !tick
                  ? "Fetching price…"
                  : lastPrice != null
                    ? `Last price ${rupees(lastPrice, 2)} · ${percent(changePercent)} today`
                    : isBrokerRequired(quoteError)
                      ? "Reconnect your broker to get prices"
                      : "No price for this symbol"}
                {lastPrice != null && (
                  <SourceLabel provider={tick ? tick.provider : quote?.data?.provider} live={!!tick} />
                )}
              </p>
            )}
          </div>

          <Segmented
            label="Order type"
            value={type}
            options={[
              { value: "MARKET", label: "Market" },
              { value: "LIMIT", label: "Limit" },
            ]}
            onChange={setType}
          />

          <div className={cn("grid gap-3", type === "LIMIT" ? "grid-cols-2" : "grid-cols-1")}>
            <div className="space-y-1.5">
              <Label htmlFor="paper-qty">Quantity</Label>
              <Input
                id="paper-qty"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            {type === "LIMIT" && (
              <div className="space-y-1.5">
                <Label htmlFor="paper-limit">Limit price</Label>
                <Input
                  id="paper-limit"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.05"
                  placeholder="0.00"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="paper-tag">Strategy</Label>
              <span className="text-[12.5px] text-muted-foreground/70">Optional</span>
            </div>
            <Input
              id="paper-tag"
              placeholder="Breakout, swing, mean reversion…"
              maxLength={100}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
          </div>

          {estimate > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2.5 text-[13.5px]">
              <span className="text-muted-foreground">{side === "BUY" ? "Estimated cost" : "Estimated proceeds"}</span>
              <span className="font-medium tabular-nums">{rupees(estimate, 2)}</span>
            </div>
          )}

          {result && (
            <p
              role={result.tone === "error" ? "alert" : "status"}
              className={cn(
                "rounded-xl px-3.5 py-2.5 text-[13.5px]",
                result.tone === "error" ? "bg-destructive/5 text-destructive" : "bg-accent text-accent-foreground"
              )}
            >
              {result.text}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading || !cleanSymbol || qty < 1 || (type === "LIMIT" && !(Number(limit) > 0))}
          >
            {isLoading && <CircleNotch className="animate-spin" />}
            {isLoading
              ? "Placing order"
              : `${side === "BUY" ? "Buy" : "Sell"}${cleanSymbol ? ` ${cleanSymbol}` : ""}`}
          </Button>
          <p className="text-center text-[12px] text-muted-foreground">
            Virtual money at delayed prices. Fees approximate a discount broker.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

const STATUS_LABEL: Record<PaperOrder["status"], string> = {
  OPEN: "Open",
  FILLED: "Filled",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

function Orders({ account }: { account: PaperAccount }) {
  const { data, isLoading } = useGetPaperOrdersQuery(account.id);
  const [cancel] = useCancelPaperOrderMutation();
  const orders = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        ) : orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[13px] font-medium text-muted-foreground">
                  <th className="pb-2 font-medium">Stock</th>
                  <th className="pb-2 font-medium">Side</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Price</th>
                  <th className="pb-2 font-medium pl-4">Status</th>
                  <th className="pb-2 font-medium">Placed</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 font-medium">
                      {o.symbol}
                      {o.strategy_tag && (
                        <span className="ml-2 text-[12px] font-normal text-muted-foreground">{o.strategy_tag}</span>
                      )}
                    </td>
                    <td className="py-2.5">{o.side === "BUY" ? "Buy" : "Sell"}</td>
                    <td className="py-2.5 text-right tabular-nums">{o.quantity}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {o.fill_price != null
                        ? rupees(o.fill_price, 2)
                        : o.limit_price != null
                          ? `${o.side === "BUY" ? "≤" : "≥"} ${rupees(o.limit_price, 2)}`
                          : "Market"}
                    </td>
                    <td className="py-2.5 pl-4">
                      <Badge
                        variant="secondary"
                        title={o.reject_reason ?? undefined}
                        className={cn(
                          "text-[11px]",
                          o.status === "OPEN" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {STATUS_LABEL[o.status]}
                      </Badge>
                      {o.status === "REJECTED" && o.reject_reason && (
                        <span className="ml-2 text-[12px] text-muted-foreground">{o.reject_reason}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 text-right">
                      {o.status === "OPEN" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Cancel ${o.symbol} order`}
                          onClick={() =>
                            cancel({ accountId: account.id, orderId: o.id })
                              .unwrap()
                              .then(() => toast.success("Order cancelled"))
                              .catch((e) => toast.error(errorMessage(e, "Couldn't cancel the order")))
                          }
                        >
                          <X />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Positions({ account }: { account: PaperAccount }) {
  const { prices } = useLivePrices(account.positions.map((p) => p.symbol));
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Positions</CardTitle>
          <Link href="/trades" className="text-[13px] font-medium text-primary-ink hover:underline">
            Review in journal
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {account.positions.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No open positions. Your fills appear here and in your journal.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[13px] text-muted-foreground">
                  <th className="pb-2 font-medium">Stock</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Avg price</th>
                  <th className="pb-2 text-right font-medium">Last</th>
                  <th className="pb-2 text-right font-medium">P&L</th>
                </tr>
              </thead>
              <tbody>
                {account.positions.map((p) => {
                  const last = prices[p.symbol]?.ltp ?? p.last_price;
                  const pnl = last != null ? p.quantity * (last - p.average_price) : p.unrealized_pnl;
                  const pnlPercent =
                    last != null && p.average_price ? ((last - p.average_price) / p.average_price) * 100 : null;
                  return (
                    <tr key={p.symbol} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5">
                        <Link href={`/stocks/${p.symbol}`} className="font-medium hover:underline">
                          {p.symbol}
                        </Link>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{p.quantity}</td>
                      <td className="py-2.5 text-right tabular-nums">{rupees(p.average_price, 2)}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {last != null ? rupees(last, 2) : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 text-right font-medium tabular-nums",
                          pnl == null ? "text-muted-foreground" : pnl >= 0 ? "text-profit" : "text-loss"
                        )}
                      >
                        {pnl == null ? "—" : `${signedRupees(pnl)} (${percent(pnlPercent ?? p.unrealized_pnl_percent ?? 0)})`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PaperTradingPage() {
  const { data, isLoading } = useGetPaperAccountsQuery();
  const [reset, { isLoading: resetting }] = useResetPaperAccountMutation();
  const [confirmReset, setConfirmReset] = useState(false);
  const account = data?.data?.[0];

  const onReset = async () => {
    if (!account) return;
    try {
      await reset(account.id).unwrap();
      toast.success("Account reset to starting cash");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't reset the account"));
    } finally {
      setConfirmReset(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-medium leading-tight tracking-[-0.035em]">Paper trading</h1>
          <p className="text-sm text-muted-foreground">
            Practise with virtual money at real prices. Not investment advice.
          </p>
        </div>
        {account &&
          (confirmReset ? (
            <div className="flex items-center gap-2" role="group" aria-label="Confirm reset">
              <span className="text-[13px] text-muted-foreground">
                Clear all orders, positions and practice journal entries?
              </span>
              <Button variant="destructive" size="sm" onClick={onReset} disabled={resetting}>
                {resetting ? "Resetting" : "Reset"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
              <ArrowCounterClockwise />
              Reset account
            </Button>
          ))}
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : !account ? (
        <CreateAccount />
      ) : (
        <>
          <Card>
            <CardContent className="grid grid-cols-2 gap-6 p-6 lg:grid-cols-4">
              <Stat label="Account value" value={rupees(account.equity)} />
              <Stat label="Cash" value={rupees(account.cash)} />
              <Stat label="Invested" value={rupees(account.holdings_value)} />
              <Stat
                label={`P&L since start (${percent(account.total_pnl_percent)})`}
                value={signedRupees(account.total_pnl)}
                tone={account.total_pnl === 0 ? undefined : account.total_pnl > 0 ? "gain" : "loss"}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <OrderTicket account={account} />
            </div>
            <div className="space-y-6 lg:col-span-2">
              <Positions account={account} />
              <Orders account={account} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
