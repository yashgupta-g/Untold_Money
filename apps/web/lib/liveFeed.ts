/**
 * Live prices from the user's own broker, over one WebSocket per tab.
 *
 * Components ask for symbols with `watch()` (reference-counted, so many
 * components can watch the same symbol) and read the latest snapshot via
 * `useSyncExternalStore` (see hooks/useLivePrices.ts). The socket only
 * opens while the user has a live broker connection; it re-sends the access
 * token after a refresh and reconnects with backoff.
 *
 * Protocol: apps/api/app/modules/stream/router.py.
 */

export interface LiveTick {
  symbol: string;
  ltp: number;
  ch: number;
  chp: number;
  volume: number;
  ts: string;
  provider: string;
}

export interface LivePnl {
  day_pnl: number;
  limit: number | null;
  breached: boolean;
  open_positions: number;
}

export type LiveState = "off" | "connecting" | "live" | "no_connection" | "expired" | "error";

export interface LiveSnapshot {
  live: boolean;
  state: LiveState;
  provider: string | null;
  prices: Record<string, LiveTick>;
  pnl: LivePnl | null;
}

const OFF: LiveSnapshot = { live: false, state: "off", provider: null, prices: {}, pnl: null };
const MAX_BACKOFF_MS = 30_000;

function socketUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${base.replace(/^http/, "ws").replace(/\/$/, "")}/api/v1/stream`;
}

class LiveFeed {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private enabled = false;
  private refs = new Map<string, number>();
  private listeners = new Set<() => void>();
  private snapshot: LiveSnapshot = OFF;
  private backoff = 1000;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private rejectedToken: string | null = null;

  // ---------------------------------------------------------------- store

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): LiveSnapshot => this.snapshot;

  getServerSnapshot = (): LiveSnapshot => OFF;

  private update(patch: Partial<LiveSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  // -------------------------------------------------------------- control

  /** Called by LiveFeedProvider whenever the token or broker status changes. */
  configure({ token, enabled }: { token: string | null; enabled: boolean }) {
    const tokenChanged = token !== this.token;
    this.token = token;
    this.enabled = enabled && !!token;

    if (!this.enabled) {
      this.close();
      return;
    }
    if (!this.ws) {
      if (this.token !== this.rejectedToken) this.open();
      return;
    }
    if (tokenChanged && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: "auth", token: this.token });
    }
  }

  /** Start receiving ticks for `symbols`; call the returned function to stop. */
  watch(symbols: string[]): () => void {
    const added = symbols.filter((s) => {
      const n = this.refs.get(s) ?? 0;
      this.refs.set(s, n + 1);
      return n === 0;
    });
    if (added.length) this.send({ type: "subscribe", symbols: added });
    return () => {
      const removed = symbols.filter((s) => {
        const n = (this.refs.get(s) ?? 1) - 1;
        if (n <= 0) this.refs.delete(s);
        else this.refs.set(s, n);
        return n <= 0;
      });
      if (removed.length) this.send({ type: "unsubscribe", symbols: removed });
    };
  }

  // ----------------------------------------------------------- connection

  private open() {
    if (typeof window === "undefined" || !this.token) return;
    this.update({ state: "connecting" });
    const ws = new WebSocket(socketUrl());
    this.ws = ws;

    ws.onopen = () => {
      this.backoff = 1000;
      ws.send(JSON.stringify({ type: "auth", token: this.token }));
      const symbols = [...this.refs.keys()];
      if (symbols.length) ws.send(JSON.stringify({ type: "subscribe", symbols }));
    };

    ws.onmessage = (event) => {
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      switch (message.type) {
        case "status":
          this.update({
            live: Boolean(message.live),
            state: (message.state as LiveState) ?? "error",
            provider: (message.provider as string) ?? null,
          });
          break;
        case "tick": {
          const tick = message as unknown as LiveTick;
          this.update({ prices: { ...this.snapshot.prices, [tick.symbol]: tick } });
          break;
        }
        case "pnl":
          this.update({ pnl: message as unknown as LivePnl });
          break;
      }
    };

    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (event.code === 4401) {
        // This token was refused; wait for the app to refresh it.
        this.rejectedToken = this.token;
        this.update({ live: false, state: "off" });
        return;
      }
      this.update({ live: false, state: this.enabled ? "connecting" : "off" });
      if (this.enabled) this.scheduleRetry();
    };
  }

  private scheduleRetry() {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.enabled && !this.ws) this.open();
    }, this.backoff);
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
  }

  private close() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    if (this.snapshot !== OFF) this.update({ ...OFF });
  }

  private send(message: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }
}

/** One feed per browser tab. */
export const liveFeed = new LiveFeed();
