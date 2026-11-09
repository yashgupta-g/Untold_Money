"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowsClockwise,
  CaretDown,
  Check,
  CircleNotch,
  Copy,
  LockKey,
  PlugsConnected,
  Warning,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rupees, signedRupees, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SourceLabel } from "@/components/market/SourceLabel";
import { useLiveFeed, useLivePrices } from "@/hooks/useLivePrices";
import {
  useConnectBrokerMutation,
  useDisconnectBrokerMutation,
  useGetBrokerSnapshotQuery,
  useGetBrokersQuery,
  useRemoveBrokerCredentialsMutation,
  useSaveBrokerCredentialsMutation,
  useSetBrokerRiskMutation,
  useSyncBrokerMutation,
  type BrokerConnection,
  type BrokerEntry,
} from "@/store/api/tradingApi";

function errorMessage(error: unknown, fallback: string): string {
  return (error as { data?: { message?: string } })?.data?.message ?? fallback;
}

const STATUS = {
  pending: { label: "Key saved", className: "bg-muted text-muted-foreground" },
  active: { label: "Connected", className: "bg-accent text-accent-foreground" },
  expired: { label: "Session ended", className: "bg-muted text-muted-foreground" },
  error: { label: "Needs attention", className: "bg-destructive/10 text-destructive" },
} as const;

const bare = (symbol: string) => symbol.replace(/^(NSE|BSE):/, "").replace(/-(EQ|BE|BZ|SM|ST)$/, "");

function Snapshot({ connectionId }: { connectionId: string }) {
  const { data, isLoading, error } = useGetBrokerSnapshotQuery(connectionId);
  const snapshot = data?.data;
  const { prices } = useLivePrices((snapshot?.positions ?? []).map((p) => bare(p.symbol)));

  if (isLoading) return <div className="h-20 animate-pulse rounded-xl bg-muted" />;
  if (error || !snapshot) {
    return <p className="text-[13px] text-muted-foreground">{errorMessage(error, "Live balances unavailable right now.")}</p>;
  }

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-4">
        {[
          ["Available cash", snapshot.funds.available_cash],
          ["Margin used", snapshot.funds.used_margin],
          ["Account value", snapshot.funds.net],
        ].map(([label, value]) => (
          <div key={label as string}>
            <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
            <dd className="text-[17px] font-medium tracking-[-0.01em] tabular-nums">
              {value == null ? "—" : rupees(value as number)}
            </dd>
          </div>
        ))}
      </dl>
      {snapshot.positions.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No open positions today.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <caption className="pb-2 text-left text-[13px] font-medium text-muted-foreground">
              Open positions today
            </caption>
            <tbody>
              {snapshot.positions.map((p) => {
                const tick = prices[bare(p.symbol)];
                const ltp = tick?.ltp ?? p.last_price;
                // The broker's P&L, moved on by the price change since the snapshot.
                const pnl =
                  p.pnl == null
                    ? null
                    : tick && p.last_price != null
                      ? p.pnl + p.net_quantity * (tick.ltp - p.last_price)
                      : p.pnl;
                return (
                  <tr key={`${p.symbol}-${p.product}`} className="border-t border-border/60">
                    <td className="py-2 font-medium">{bare(p.symbol)}</td>
                    <td className="py-2 text-muted-foreground">{p.product}</td>
                    <td className="py-2 text-right tabular-nums">{p.net_quantity}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {ltp == null ? "—" : rupees(ltp, 2)}
                    </td>
                    <td
                      className={cn(
                        "py-2 text-right font-medium tabular-nums",
                        pnl == null ? "text-muted-foreground" : pnl >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {pnl == null ? "—" : signedRupees(pnl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Live day P&L from the stream, and the user's own daily-loss alert.
 * Alert only: nothing is blocked, since no orders are placed from here yet.
 */
function RiskPanel({ conn }: { conn: BrokerConnection }) {
  const feed = useLiveFeed();
  const [setRisk, { isLoading: saving }] = useSetBrokerRiskMutation();
  const [value, setValue] = useState(conn.daily_loss_limit ? String(conn.daily_loss_limit) : "");
  const [error, setError] = useState<string | null>(null);
  const fieldId = `${conn.broker}-loss-limit`;
  const pnl = feed.pnl;

  const save = async (limit: number | null) => {
    setError(null);
    try {
      await setRisk({ id: conn.id, daily_loss_limit: limit }).unwrap();
      if (limit === null) setValue("");
      toast.success(limit === null ? "Daily-loss alert off" : `Alert set at a ${rupees(limit)} loss`);
    } catch (e) {
      setError(errorMessage(e, "Couldn't save the alert"));
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const limit = Number(value.replace(/[₹,\s]/g, ""));
    if (!Number.isFinite(limit) || limit <= 0) {
      setError("Enter a loss amount in rupees, e.g. 5000.");
      return;
    }
    void save(limit);
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[12.5px] text-muted-foreground">Day P&amp;L</p>
          <p
            className={cn(
              "text-[17px] font-medium tracking-[-0.01em] tabular-nums",
              !pnl ? "text-muted-foreground" : pnl.day_pnl >= 0 ? "text-profit" : "text-loss"
            )}
          >
            {pnl ? signedRupees(pnl.day_pnl) : "—"}
          </p>
        </div>
        <SourceLabel provider={conn.broker} live={feed.live} />
      </div>

      {pnl?.breached && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-loss/10 px-3.5 py-2.5 text-[13.5px] text-loss">
          <Warning className="mt-0.5 h-4 w-4 shrink-0" />
          Today&apos;s loss has passed your {rupees(pnl.limit ?? 0)} limit. Time to step back.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-1.5" noValidate>
        <Label htmlFor={fieldId}>Daily-loss alert</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={fieldId}
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 5000"
            className="w-40"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${fieldId}-error` : `${fieldId}-hint`}
          />
          <Button type="submit" variant="outline" size="sm" disabled={saving || !value.trim()}>
            {saving ? "Saving" : "Save"}
          </Button>
          {conn.daily_loss_limit != null && (
            <Button type="button" variant="ghost" size="sm" onClick={() => save(null)} disabled={saving}>
              Turn off
            </Button>
          )}
        </div>
        {error ? (
          <p id={`${fieldId}-error`} role="alert" className="text-[13px] text-loss">
            {error}
          </p>
        ) : (
          <p id={`${fieldId}-hint`} className="text-[12px] text-muted-foreground">
            {conn.daily_loss_limit != null
              ? `On at a ${rupees(conn.daily_loss_limit)} loss. `
              : ""}
            We&apos;ll warn you here while the page is open. Nothing is blocked.
          </p>
        )}
      </form>
    </div>
  );
}

/**
 * Advanced: a user's own broker developer app. Used until the platform's
 * partner app is approved, or by anyone who prefers their own.
 */
function OwnKeyPanel({ entry }: { entry: BrokerEntry }) {
  const [open, setOpen] = useState(!entry.platform_configured && !entry.own_key);
  const [appId, setAppId] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [save, { isLoading: saving }] = useSaveBrokerCredentialsMutation();
  const [remove, { isLoading: removing }] = useRemoveBrokerCredentialsMutation();
  const idLabel = entry.broker === "fyers" ? "App ID" : "API key";
  const fieldId = (name: string) => `${entry.broker}-${name}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(entry.redirect_uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the URL is selectable text anyway.
    }
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await save({
        broker: entry.broker,
        app_id: appId.trim(),
        app_secret: entry.needs_secret ? secret.trim() : undefined,
      }).unwrap();
      setAppId("");
      setSecret("");
      toast.success("API key saved. Connect to sign in with your broker.");
    } catch (e) {
      setError(errorMessage(e, "Couldn't save the key. Check it and try again."));
    }
  };

  const onRemove = async () => {
    try {
      await remove(entry.broker).unwrap();
      toast.success("API key removed");
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't remove the key"));
    } finally {
      setConfirmRemove(false);
    }
  };

  if (entry.own_key) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[13px]">
        <span className="text-muted-foreground">
          Using your own {idLabel} <span className="font-medium text-foreground">{entry.own_key}</span>
        </span>
        {confirmRemove ? (
          <span className="flex items-center gap-2" role="group" aria-label="Confirm removing the key">
            <span className="text-muted-foreground">Removing it also unlinks the account.</span>
            <Button variant="destructive" size="sm" onClick={onRemove} disabled={removing}>
              Remove
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>
              Keep
            </Button>
          </span>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>
            Remove key
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={fieldId("own-key")}
        className="flex w-full items-center justify-between bg-transparent text-left text-[13.5px] font-medium"
      >
        <span>
          Use your own API key
          <span className="ml-2 font-normal text-muted-foreground">Advanced · read-only</span>
        </span>
        <CaretDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <form id={fieldId("own-key")} onSubmit={onSave} className="mt-4 space-y-4" noValidate>
          <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-pretty text-muted-foreground">
            <li>
              Create an app in the {entry.label} developer portal
              {entry.broker === "angelone" ? " (SmartAPI, publisher login)" : ""}, signed in with
              your own trading account.
            </li>
            <li>Set its redirect URL to:</li>
          </ol>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 py-1.5 pl-3.5 pr-1.5">
            <code className="min-w-0 flex-1 truncate font-sans text-[12.5px] text-foreground" title={entry.redirect_uri}>
              {entry.redirect_uri}
            </code>
            <Button type="button" variant="ghost" size="sm" onClick={onCopy} aria-label="Copy redirect URL">
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-[13px] text-muted-foreground">Then paste the app&apos;s details here.</p>

          <div className="space-y-1.5">
            <Label htmlFor={fieldId("app-id")}>{idLabel}</Label>
            <Input
              id={fieldId("app-id")}
              autoComplete="off"
              spellCheck={false}
              placeholder={entry.broker === "fyers" ? "ABCD1234-100" : "Your SmartAPI key"}
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? fieldId("key-error") : undefined}
            />
          </div>
          {entry.needs_secret && (
            <div className="space-y-1.5">
              <Label htmlFor={fieldId("secret")}>Secret ID</Label>
              <Input
                id={fieldId("secret")}
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                aria-invalid={!!error}
              />
            </div>
          )}
          {error && (
            <p id={fieldId("key-error")} role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              variant="outline"
              disabled={saving || !appId.trim() || (entry.needs_secret && !secret.trim())}
            >
              {saving && <CircleNotch className="animate-spin" />}
              {saving ? "Saving" : "Save key"}
            </Button>
            <span className="text-[12px] text-muted-foreground">
              Stored encrypted and never shown again in full.
            </span>
          </div>
        </form>
      )}
    </div>
  );
}

function BrokerCard({ entry }: { entry: BrokerEntry }) {
  const [connect, { isLoading: connecting }] = useConnectBrokerMutation();
  const [sync, { isLoading: syncing }] = useSyncBrokerMutation();
  const [disconnect, { isLoading: disconnecting }] = useDisconnectBrokerMutation();
  const [confirm, setConfirm] = useState(false);
  const conn = entry.connection;
  const status = conn ? STATUS[conn.status] : null;

  const onConnect = async () => {
    try {
      const response = await connect(entry.broker).unwrap();
      // Off to the broker's own sign-in page; it sends the browser back here.
      window.location.assign(response.data.login_url);
    } catch (error) {
      toast.error(errorMessage(error, `Couldn't start the ${entry.label} sign-in`));
    }
  };

  const onSync = async () => {
    if (!conn) return;
    try {
      const { data } = await sync(conn.id).unwrap();
      const skipped = data.unmapped_symbols.length
        ? ` ${data.unmapped_symbols.length} non-equity ${data.unmapped_symbols.length === 1 ? "item" : "items"} skipped.`
        : "";
      toast.success(
        data.holdings === 0 && data.trades_journaled === 0
          ? `Synced. ${entry.label} returned no holdings and no new trades today.${skipped}`
          : `Synced ${data.holdings} ${data.holdings === 1 ? "holding" : "holdings"}, ${data.trades_journaled} new ${data.trades_journaled === 1 ? "trade" : "trades"} journaled.${skipped}`
      );
    } catch (error) {
      toast.error(errorMessage(error, "Sync failed. Please try again."));
    }
  };

  const onDisconnect = async () => {
    if (!conn) return;
    try {
      await disconnect(conn.id).unwrap();
      toast.success(`${entry.label} disconnected`);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't disconnect"));
    } finally {
      setConfirm(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-[19px] font-medium tracking-[-0.02em]">{entry.label}</CardTitle>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {conn && conn.status !== "pending"
                ? `${conn.display_name ?? "Account"}${conn.broker_user_id ? ` · ${conn.broker_user_id}` : ""} · synced ${timeAgo(conn.last_synced_at)}`
                : entry.configured
                  ? "Not connected"
                  : "Add your own API key to connect"}
            </p>
          </div>
          {status && (
            <Badge variant="secondary" className={cn("text-[11px]", status.className)}>
              {status.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {conn?.status === "active" && <Snapshot connectionId={conn.id} />}
        {conn?.status === "active" && conn.live_data && <RiskPanel conn={conn} />}
        {conn && conn.status !== "active" && (
          <p className="rounded-xl bg-muted/60 px-3.5 py-2.5 text-[13.5px] text-muted-foreground">
            {conn.status === "pending"
              ? `Your API key is saved. Connect to sign in with ${entry.label}.`
              : conn.status === "expired"
                ? `Brokers end API sessions every day. Reconnect ${entry.label} to sync again.`
                : conn.last_error ?? "The last sync failed."}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!conn || conn.status === "pending" || conn.status === "expired" ? (
            <Button onClick={onConnect} disabled={!entry.configured || connecting}>
              {connecting ? <CircleNotch className="animate-spin" /> : <PlugsConnected />}
              {connecting
                ? "Opening sign-in"
                : !entry.configured
                  ? "Not set up yet"
                  : conn?.status === "expired"
                    ? "Reconnect"
                    : `Connect ${entry.label}`}
            </Button>
          ) : (
            <Button variant="outline" onClick={onSync} disabled={syncing}>
              <ArrowsClockwise className={cn(syncing && "animate-spin")} />
              {syncing ? "Syncing" : "Sync now"}
            </Button>
          )}
          {conn &&
            conn.status !== "pending" &&
            (confirm ? (
              <span className="flex items-center gap-2" role="group" aria-label="Confirm disconnect">
                <span className="text-[13px] text-muted-foreground">Delete the link? Your journal stays.</span>
                <Button variant="destructive" size="sm" onClick={onDisconnect} disabled={disconnecting}>
                  Disconnect
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
                  Keep
                </Button>
              </span>
            ) : (
              <Button variant="ghost" onClick={() => setConfirm(true)}>
                Disconnect
              </Button>
            ))}
        </div>

        <OwnKeyPanel entry={entry} />
      </CardContent>
    </Card>
  );
}

export default function BrokersPage() {
  // useSearchParams needs a Suspense boundary so the page can still prerender.
  return (
    <Suspense fallback={null}>
      <Brokers />
    </Suspense>
  );
}

function Brokers() {
  const router = useRouter();
  const params = useSearchParams();
  const { data, isLoading } = useGetBrokersQuery();
  // Read once on arrival from the broker's sign-in page; kept after the URL is tidied.
  const [callbackError] = useState(() => params.get("error"));

  useEffect(() => {
    const connected = params.get("connected");
    if (!connected && !params.get("error")) return;
    if (connected) toast.success("Broker connected. Holdings and today's trades are synced.");
    router.replace("/brokers");
  }, [params, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-medium leading-tight tracking-[-0.035em]">Brokers</h1>
        <p className="text-sm text-muted-foreground">
          Link your own broker account to bring in holdings, positions and trades.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-[13.5px] text-muted-foreground">
        <LockKey className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
        <p className="text-pretty">
          Read-only for now: UntoldMoney can see your holdings, positions, funds and today&apos;s
          trades, and can&apos;t place orders or move money. Once linked, prices across the app
          come live from your broker, for you only. You sign in on your broker&apos;s own page; we
          never see your password or PIN. Your money always stays with your broker.
          Want to practise first? Use{" "}
          <Link href="/paper" className="font-medium text-primary-ink hover:underline">
            paper trading
          </Link>
          .
        </p>
      </div>

      {callbackError && (
        <p role="alert" className="rounded-xl bg-destructive/5 px-4 py-3 text-[13.5px] text-destructive">
          {callbackError}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {(data?.data.brokers ?? []).map((entry) => (
            <BrokerCard key={entry.broker} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
