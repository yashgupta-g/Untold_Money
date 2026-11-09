"use client";

import { useEffect, useRef, useState } from "react";
import { CircleNotch } from "@phosphor-icons/react";

import { ConnectBrokerPrompt } from "@/components/market/ConnectBrokerPrompt";
import { createDatafeed } from "@/lib/tradingview/datafeed";
import type { IChartingLibraryWidget } from "@/lib/tradingview/types";
import { CandlestickFallback } from "./CandlestickFallback";

/**
 * TradingView Advanced Charts (Charting Library) on the user's own broker
 * data: candles and every chart type, 100+ indicators, drawing tools,
 * compare, multiple timeframes and live updates.
 *
 * The library is licensed and distributed privately by TradingView, so it
 * isn't in npm or git: copy its `charting_library/` folder into
 * `apps/web/public/`. Until then a plain candlestick chart is shown.
 */

const LIBRARY_PATH = "/charting_library/";
const SCRIPT = `${LIBRARY_PATH}charting_library.standalone.js`;

let loading: Promise<boolean> | null = null;

function loadLibrary(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.TradingView?.widget) return Promise.resolve(true);
  loading ??= new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve(!!window.TradingView?.widget);
    script.onerror = () => {
      script.remove();
      loading = null; // installed later: try again on the next visit
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return loading;
}

function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function TradingViewChart({
  symbol,
  connected,
  expired = false,
}: {
  symbol: string;
  /** The user has a live broker connection (market data needs one). */
  connected: boolean;
  expired?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<IChartingLibraryWidget | null>(null);
  const [library, setLibrary] = useState<"checking" | "ready" | "missing">("checking");

  useEffect(() => {
    let cancelled = false;
    loadLibrary().then((ok) => {
      if (!cancelled) setLibrary(ok ? "ready" : "missing");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Create the widget once per page; later symbol changes reuse it.
  useEffect(() => {
    if (library !== "ready" || !connected || !container.current || !window.TradingView) return;
    const dark = document.documentElement.classList.contains("dark");
    const up = token("--chart-up", "#0f9d6b");
    const down = token("--chart-down", "#e0484d");
    const background = token("--card", "#ffffff");
    const grid = dark ? "rgba(255,255,255,0.06)" : "rgba(11,11,12,0.06)";

    const instance = new window.TradingView.widget({
      container: container.current,
      library_path: LIBRARY_PATH,
      datafeed: createDatafeed(),
      symbol,
      interval: "1D",
      locale: "en",
      timezone: "Asia/Kolkata",
      autosize: true,
      theme: dark ? "dark" : "light",
      custom_font_family: "'SF Pro Display', -apple-system, Inter, sans-serif",
      loading_screen: { backgroundColor: background },
      favorites: { intervals: ["5", "15", "60", "1D"] },
      // No server-side layout storage yet; settings stay in this browser.
      disabled_features: ["header_saveload"],
      enabled_features: ["side_toolbar_in_fullscreen_mode", "header_in_fullscreen_mode"],
      overrides: {
        "paneProperties.background": background,
        "paneProperties.backgroundType": "solid",
        "paneProperties.vertGridProperties.color": grid,
        "paneProperties.horzGridProperties.color": grid,
        "mainSeriesProperties.candleStyle.upColor": up,
        "mainSeriesProperties.candleStyle.downColor": down,
        "mainSeriesProperties.candleStyle.borderUpColor": up,
        "mainSeriesProperties.candleStyle.borderDownColor": down,
        "mainSeriesProperties.candleStyle.wickUpColor": up,
        "mainSeriesProperties.candleStyle.wickDownColor": down,
      },
      studies_overrides: {
        "volume.volume.color.0": down,
        "volume.volume.color.1": up,
      },
    });
    widget.current = instance;
    return () => {
      instance.remove();
      widget.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- symbol changes go through setSymbol below
  }, [library, connected]);

  useEffect(() => {
    const instance = widget.current;
    if (!instance) return;
    instance.onChartReady(() => instance.setSymbol(symbol, "1D"));
  }, [symbol]);

  if (!connected) return <ConnectBrokerPrompt expired={expired} />;

  if (library === "checking") {
    return (
      <div className="flex h-[560px] items-center justify-center">
        <CircleNotch className="h-6 w-6 animate-spin text-primary-ink" />
      </div>
    );
  }

  if (library === "missing") {
    return (
      <div className="space-y-3">
        <CandlestickFallback symbol={symbol} />
        {process.env.NODE_ENV !== "production" && (
          <p className="text-[12px] text-muted-foreground">
            Dev note: add TradingView&apos;s <code>charting_library/</code> to <code>apps/web/public/</code>{" "}
            for the full chart (indicators, drawing tools).
          </p>
        )}
      </div>
    );
  }

  return <div ref={container} className="h-[560px] w-full overflow-hidden rounded-xl sm:h-[620px]" />;
}
