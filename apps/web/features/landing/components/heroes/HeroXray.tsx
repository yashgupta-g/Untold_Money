"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";

import { Brain, ChartLineUp, ChartPieSlice } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { POSITIONING } from "../../content";
import { MQ_REDUCE } from "../../motion";
import { IsoIcon } from "../IsoIcon";
import { mono } from "./fonts";
import { HeroCtas } from "./parts";
import styles from "./xray.module.css";

/**
 * X-ray. The chart looks calm and simple until the cursor passes over it:
 * inside the lens the skeleton shows, every candle, average, oscillator and
 * the rule each one triggered. On touch screens the lens wanders by itself.
 */

/* ---------- sample series (seeded, identical on server and client) ---------- */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TOTAL = 140;
const SHOWN = 90;
const W = 1200;
const H = 520;
const PX = { left: 20, right: 1110 };
const PRICE = { top: 30, bottom: 320 };
const VOL = { top: 336, bottom: 386 };
const RSI = { top: 410, bottom: 500 };

const SERIES = (() => {
  const rand = seeded(23);
  const closes: number[] = [];
  let c = 2620;
  for (let i = 0; i < TOTAL; i++) {
    c += (rand() - 0.46) * 34 + Math.sin(i / 11) * 6;
    closes.push(c);
  }
  const shift = 2948.6 - closes[TOTAL - 1];
  return closes.map((v) => v + shift);
})();

const VOLUME = (() => {
  const rand = seeded(5);
  return SERIES.map(() => 0.3 + rand() * 0.45 + (rand() > 0.93 ? 0.4 : 0));
})();

const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
const smaAt = (period: number, i: number) => avg(SERIES.slice(i - period + 1, i + 1));

/** Wilder's RSI 14 for every point after the first 14. */
const RSI14 = (() => {
  const out: number[] = new Array(TOTAL).fill(50);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= 14; i++) {
    const d = SERIES[i] - SERIES[i - 1];
    gain += Math.max(0, d);
    loss += Math.max(0, -d);
  }
  gain /= 14;
  loss /= 14;
  for (let i = 15; i < TOTAL; i++) {
    const d = SERIES[i] - SERIES[i - 1];
    gain = (gain * 13 + Math.max(0, d)) / 14;
    loss = (loss * 13 + Math.max(0, -d)) / 14;
    out[i] = 100 - 100 / (1 + gain / (loss || 1e-9));
  }
  return out;
})();

const FIRST = TOTAL - SHOWN;
const idx = Array.from({ length: SHOWN }, (_, j) => FIRST + j);
const LO = Math.min(...idx.map((i) => SERIES[i])) - 30;
const HI = Math.max(...idx.map((i) => SERIES[i])) + 30;
const x = (i: number) => PX.left + ((i - FIRST) / (SHOWN - 1)) * (PX.right - PX.left);
const y = (p: number) => PRICE.top + (1 - (p - LO) / (HI - LO)) * (PRICE.bottom - PRICE.top);
const ry = (r: number) => RSI.top + (1 - r / 100) * (RSI.bottom - RSI.top);
const path = (pts: [number, number][]) =>
  pts.map(([px, py], n) => `${n ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");

const LINE = path(idx.map((i) => [x(i), y(SERIES[i])]));
const AREA = `${LINE} L${x(TOTAL - 1)} ${PRICE.bottom} L${x(FIRST)} ${PRICE.bottom} Z`;
const SMA20 = path(idx.map((i) => [x(i), y(smaAt(20, i))]));
const SMA50 = path(idx.map((i) => [x(i), y(smaAt(50, i))]));
const RSI_LINE = path(idx.map((i) => [x(i), ry(RSI14[i])]));
const STEP = (PX.right - PX.left) / (SHOWN - 1);
const TICKS = (() => {
  const out: number[] = [];
  for (let t = Math.ceil(LO / 50) * 50; t <= HI; t += 50) out.push(t);
  return out;
})();

/* Annotations sit on real features of the series. */
const LAST = TOTAL - 1;
const LOW_RSI = idx.reduce((m, i) => (RSI14[i] < RSI14[m] ? i : m), idx[0]);
const PEAK_VOL = idx.reduce((m, i) => (VOLUME[i] > VOLUME[m] ? i : m), idx[0]);
const VOL_AVG = avg(VOLUME.slice(PEAK_VOL - 20, PEAK_VOL));
const ABOVE_50 = SERIES[LAST] > smaAt(50, LAST);
const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function HeroXray() {
  const panelRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const plot = plotRef.current;
    if (!panel || !plot) return;
    const reduce = window.matchMedia(MQ_REDUCE).matches;
    const box = () => panel.getBoundingClientRect();
    let { width } = box();
    let plotTop = plot.offsetTop;
    let plotW = plot.offsetWidth;
    let plotH = plot.offsetHeight;

    // Where the price line sits at a given x, in panel pixels (the plot is
    // drawn with xMaxYMax slice), so the idle lens can ride along it.
    const lineY = (px: number) => {
      const scale = Math.max(plotW / W, plotH / H);
      const vx = (px - (plotW - W * scale)) / scale;
      const i = Math.round(FIRST + ((vx - PX.left) / (PX.right - PX.left)) * (SHOWN - 1));
      const clamped = Math.min(TOTAL - 1, Math.max(FIRST, i));
      return plotTop + y(SERIES[clamped]) * scale - (H * scale - plotH);
    };
    // Lens starts over the latest candles.
    const pos = { x: width * 0.78, y: lineY(width * 0.78) + 36 };
    const target = { ...pos };
    let lastMove = -Infinity;
    let frame = 0;

    // --lx/--ly place the lens in the panel; --mx/--my centre the masks on the plot.
    const write = () => {
      panel.style.setProperty("--lx", `${pos.x.toFixed(1)}px`);
      panel.style.setProperty("--ly", `${pos.y.toFixed(1)}px`);
      panel.style.setProperty("--mx", `${pos.x.toFixed(1)}px`);
      panel.style.setProperty("--my", `${(pos.y - plotTop).toFixed(1)}px`);
    };
    write();
    if (reduce) return;

    const tick = (t: number) => {
      // Idle (or touch): wander along a slow figure-eight over the chart.
      if (t - lastMove > 2600) {
        const s = t / 1000;
        target.x = width * (0.62 + 0.28 * Math.sin(s * 0.42));
        target.y = lineY(target.x) + 36 + 24 * Math.sin(s * 0.9);
      }
      pos.x += (target.x - pos.x) * 0.12;
      pos.y += (target.y - pos.y) * 0.12;
      write();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = box();
      target.x = e.clientX - r.left;
      target.y = e.clientY - r.top;
      lastMove = performance.now();
    };
    const onResize = () => {
      ({ width } = box());
      plotTop = plot.offsetTop;
      plotW = plot.offsetWidth;
      plotH = plot.offsetHeight;
    };
    panel.addEventListener("pointermove", onMove);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      panel.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section
      id="top"
      className={cn(styles.hero, mono.variable)}
      data-nav="ink"
      aria-labelledby="hero-title"
    >
      <div ref={panelRef} className={styles.panel}>
        <Image
          src="/landing/heroes/city.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className={styles.photo}
        />
        {/* Inside the lens the city turns into its own negative: the x-ray. */}
        <div className={styles.negative} aria-hidden="true">
          <Image src="/landing/heroes/city.webp" alt="" fill sizes="100vw" />
        </div>
        <div className={styles.wash} aria-hidden="true" />
        <div className={styles.copy}>
          <span className={styles.eyebrow}>{POSITIONING.eyebrow}</span>
          <h1 id="hero-title" className={styles.title}>
            See what&rsquo;s really moving your money.
          </h1>
          <p className={styles.lede}>
            Live market data, AI analysis on the horizon you choose and a clear view of where your
            capital sits, all in one workspace.
          </p>
          <HeroCtas />
          <span className={styles.hint}>
            <i aria-hidden="true" />
            Move your cursor over the chart to look underneath
          </span>
        </div>

        {/* What the workspace knows about this stock, floating over the sky. */}
        <ul className={styles.insights} aria-label="Sample insights for RELIANCE">
          <li className={styles.insight} style={{ "--i": 0 } as CSSProperties}>
            <IsoIcon icon={Brain} tone="cobalt" size={52} />
            <span>
              <b>AI analysis</b>
              Your 3-day setup. Accuracy on unseen data: 57%.
            </span>
          </li>
          <li className={styles.insight} style={{ "--i": 1 } as CSSProperties}>
            <IsoIcon icon={ChartLineUp} tone="light" size={52} />
            <span>
              <b>Market data</b>
              RELIANCE ₹2,948.60, up 1.24% today
            </span>
          </li>
          <li className={styles.insight} style={{ "--i": 2 } as CSSProperties}>
            <IsoIcon icon={ChartPieSlice} tone="light" size={52} />
            <span>
              <b>Your portfolio</b>
              RELIANCE is 21.4% of your holdings
            </span>
          </li>
        </ul>

        <div ref={plotRef} className={styles.plot}>
          {/* Surface: what most apps show. */}
          <svg
            className={cn(styles.chart, styles.surface)}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMaxYMax slice"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="xr-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" className={styles.areaTop} />
                <stop offset="1" className={styles.areaBottom} />
              </linearGradient>
            </defs>
            <path d={AREA} fill="url(#xr-area)" />
            <path d={LINE} className={styles.surfaceLine} />
          </svg>

          {/* Skeleton: what the lens reveals. */}
          <svg
            className={cn(styles.chart, styles.skeleton)}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMaxYMax slice"
            aria-hidden="true"
          >
            {TICKS.map((t) => (
              <g key={t}>
                <line x1={PX.left} x2={W} y1={y(t)} y2={y(t)} className={styles.grid} />
                <text x={W - 6} y={y(t) - 4} className={styles.axis}>
                  {t}
                </text>
              </g>
            ))}
            {idx.map((i) => {
              const o = SERIES[i - 1];
              const c = SERIES[i];
              const up = c >= o;
              const hi = Math.max(o, c) + 6 + (i % 5) * 2;
              const lo = Math.min(o, c) - 6 - (i % 3) * 3;
              return (
                <g key={i} className={up ? styles.up : styles.down}>
                  <line x1={x(i)} x2={x(i)} y1={y(hi)} y2={y(lo)} />
                  <rect
                    x={x(i) - STEP * 0.3}
                    y={y(Math.max(o, c))}
                    width={STEP * 0.6}
                    height={Math.max(1.5, Math.abs(y(o) - y(c)))}
                  />
                </g>
              );
            })}
            <path d={SMA20} className={styles.sma20} />
            <path d={SMA50} className={styles.sma50} />
            {idx.map((i) => (
              <rect
                key={`v${i}`}
                x={x(i) - STEP * 0.3}
                y={VOL.bottom - VOLUME[i] * (VOL.bottom - VOL.top)}
                width={STEP * 0.6}
                height={VOLUME[i] * (VOL.bottom - VOL.top)}
                className={i === PEAK_VOL ? styles.volPeak : styles.vol}
              />
            ))}
            <rect
              x={PX.left}
              y={ry(70)}
              width={PX.right - PX.left}
              height={ry(30) - ry(70)}
              className={styles.rsiBand}
            />
            <path d={RSI_LINE} className={styles.rsi} />
            <text x={PX.left} y={RSI.top - 6} className={styles.axis}>
              RSI 14
            </text>

            <Note x={x(LAST)} y={y(SERIES[LAST])} dx={-250} dy={-60}>
              {`Close ₹${inr.format(SERIES[LAST])}, ${ABOVE_50 ? "above" : "below"} its 50-day average`}
            </Note>
            <Note x={x(LOW_RSI)} y={ry(RSI14[LOW_RSI])} dx={30} dy={-34}>
              {`RSI 14 at ${RSI14[LOW_RSI].toFixed(1)}: ${RSI14[LOW_RSI] < 30 ? "below 30, oversold zone" : "near the oversold zone"}`}
            </Note>
            <Note
              x={x(PEAK_VOL)}
              y={VOL.bottom - VOLUME[PEAK_VOL] * (VOL.bottom - VOL.top)}
              dx={24}
              dy={-40}
            >
              {`Volume ${(VOLUME[PEAK_VOL] / VOL_AVG).toFixed(1)}× its 20-day average`}
            </Note>
          </svg>
        </div>

        <div className={styles.lens} aria-hidden="true">
          <span className={styles.rim} />
          <span className={styles.lensTag}>X-ray</span>
        </div>
      </div>
    </section>
  );
}

function Note({
  x: px,
  y: py,
  dx,
  dy,
  children,
}: {
  x: number;
  y: number;
  dx: number;
  dy: number;
  children: string;
}) {
  return (
    <g className={styles.note}>
      <circle cx={px} cy={py} r="4" />
      <path d={`M${px} ${py} L${px + dx * 0.25} ${py + dy} L${px + dx} ${py + dy}`} />
      <text x={px + dx + (dx < 0 ? -6 : 6)} y={py + dy + 4} textAnchor={dx < 0 ? "end" : "start"}>
        {children}
      </text>
    </g>
  );
}
