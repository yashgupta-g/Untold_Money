"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "motion/react";
import {
  ArrowUp,
  ArrowUpRight,
  Brain,
  ChartLineUp,
  ChartPieSlice,
  CurrencyInr,
  Notebook,
  Info,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { TOUR_TABS, type TourTab } from "../content";
import shared from "../landing.module.css";
import { MQ_REDUCE, SPRING } from "../motion";
import styles from "./tour.module.css";

/** idle: server render, everything drawn. armed: hydrated, waiting to be seen. play: animate in. */
type Phase = "idle" | "armed" | "play";
type TabId = TourTab["id"];

const TAB_ICONS: Record<TabId, Icon> = {
  analysis: Brain,
  market: ChartLineUp,
  allocation: ChartPieSlice,
  journal: Notebook,
};

/* ---------- formatting ---------- */
const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const fmtPrice = (n: number) => `₹${inr2.format(n)}`;
const fmtRupees = (n: number) => `₹${inr0.format(Math.round(n))}`;
const fmtInt = (n: number) => inr0.format(Math.round(n));
const fmtPct = (n: number) => `${Math.round(n)}%`;

/* ---------- sample data (seeded, so server and client draw the same chart) ---------- */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Candle = { o: number; h: number; l: number; c: number; v: number };

/** 48 daily candles that close at the hero's sample price, ₹2,948.60. */
const LAST_PRICE = 2948.6;
const CANDLES: Candle[] = (() => {
  const rand = seeded(11);
  const raw: Candle[] = [];
  let close = 2790;
  for (let i = 0; i < 48; i++) {
    const o = close;
    const c = o + (rand() - 0.43) * 44;
    const spike = rand() > 0.88 ? 0.35 : 0;
    raw.push({
      o,
      c,
      h: Math.max(o, c) + rand() * 18,
      l: Math.min(o, c) - rand() * 18,
      v: Math.min(1, 0.3 + rand() * 0.5 + spike),
    });
    close = c;
  }
  const shift = LAST_PRICE - close;
  return raw.map((k) => ({ ...k, o: k.o + shift, h: k.h + shift, l: k.l + shift, c: k.c + shift }));
})();

const sma = (period: number, end: number) =>
  CANDLES.slice(end - period + 1, end + 1).reduce((sum, k) => sum + k.c, 0) / period;

/* Price chart geometry, in viewBox units. */
const CW = 600;
const CH = 300;
const P = { left: 46, right: 6, top: 10, priceBottom: 198, volTop: 214, volBottom: 270 };
const LO = Math.min(...CANDLES.map((k) => k.l));
const HI = Math.max(...CANDLES.map((k) => k.h));
const STEP = (CW - P.left - P.right) / CANDLES.length;
const BODY = STEP * 0.56;
const cx = (i: number) => P.left + STEP * (i + 0.5);
const priceY = (p: number) => P.top + (1 - (p - LO) / (HI - LO)) * (P.priceBottom - P.top);
const volY = (v: number) => P.volBottom - v * (P.volBottom - P.volTop);
const PRICE_TICKS = (() => {
  const step = HI - LO > 260 ? 100 : 50;
  const ticks: number[] = [];
  for (let t = Math.ceil(LO / step) * step; t <= HI; t += step) ticks.push(t);
  return ticks;
})();
const SMA_PATH = CANDLES.map((_, i) => i)
  .filter((i) => i >= 19)
  .map((i, n) => `${n ? "L" : "M"}${cx(i).toFixed(1)} ${priceY(sma(20, i)).toFixed(1)}`)
  .join(" ");
const MONTHS = [
  { i: 2, label: "Jul" },
  { i: 24, label: "Aug" },
  { i: 45, label: "Sep" },
];
const SMA_NOW = sma(20, CANDLES.length - 1);

/* Direction chart: the last 36 closes, then a 5-day range cone. */
const DW = 600;
const DH = 220;
const D = { left: 46, right: 64, top: 14, bottom: 196 };
const RECENT = CANDLES.slice(-36).map((k) => k.c);
const AHEAD = 5;
const RANGE = Array.from({ length: AHEAD + 1 }, (_, j) => ({
  mid: LAST_PRICE + j * 7,
  spread: 16 * Math.sqrt(j),
}));
const D_LO = Math.min(...RECENT, ...RANGE.map((r) => r.mid - r.spread)) - 8;
const D_HI = Math.max(...RECENT, ...RANGE.map((r) => r.mid + r.spread)) + 8;
const D_STEP = (DW - D.left - D.right) / (RECENT.length - 1 + AHEAD);
const dx = (i: number) => D.left + D_STEP * i;
const dy = (p: number) => D.top + (1 - (p - D_LO) / (D_HI - D_LO)) * (D.bottom - D.top);
const NOW_X = dx(RECENT.length - 1);
const LINE_PATH = RECENT.map(
  (c, i) => `${i ? "L" : "M"}${dx(i).toFixed(1)} ${dy(c).toFixed(1)}`,
).join(" ");
const AREA_PATH = `${LINE_PATH} L${NOW_X.toFixed(1)} ${D.bottom} L${D.left} ${D.bottom} Z`;
const CONE_PATH = [
  ...RANGE.map(
    (r, j) =>
      `${j ? "L" : "M"}${dx(RECENT.length - 1 + j).toFixed(1)} ${dy(r.mid + r.spread).toFixed(1)}`,
  ),
  ...RANGE.map((r, j) => ({ r, j }))
    .reverse()
    .map(
      ({ r, j }) => `L${dx(RECENT.length - 1 + j).toFixed(1)} ${dy(r.mid - r.spread).toFixed(1)}`,
    ),
  "Z",
].join(" ");
const MID_PATH = RANGE.map(
  (r, j) => `${j ? "L" : "M"}${dx(RECENT.length - 1 + j).toFixed(1)} ${dy(r.mid).toFixed(1)}`,
).join(" ");
const D_TICKS = (() => {
  const ticks: number[] = [];
  for (let t = Math.ceil(D_LO / 50) * 50; t <= D_HI; t += 50) ticks.push(t);
  return ticks;
})();

/** Sample journal: P&L of the last 14 trades (%), and the habits behind them. */
const TRADES = [2.4, -1.1, 3.6, 0.8, -2.2, 1.9, -0.6, 4.1, -1.8, 0.5, 2.7, -0.9, 1.4, 3.2];
const HABITS = [
  { label: "Early exit when nervous", count: 4, hot: true },
  { label: "Chased a breakout", count: 2 },
  { label: "Position too large", count: 1 },
];

/** Same sample portfolio as the story section: ₹12,45,680, HDFCBANK over the limit. */
const HOLDINGS = [
  { symbol: "HDFCBANK", sector: "Financials", weight: 34.2 },
  { symbol: "RELIANCE", sector: "Energy", weight: 21.4 },
  { symbol: "TCS", sector: "IT", weight: 18.6 },
  { symbol: "ITC", sector: "FMCG", weight: 14.1 },
  { symbol: "SUNPHARMA", sector: "Pharma", weight: 11.7 },
];
const LIMIT = 30;

const noop = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/**
 * Dark product tour: four tabs, each swapping in a sample screen whose
 * numbers count up and whose chart draws itself the first time it is seen.
 */
export function Tour() {
  const [active, setActive] = useState<TabId>("analysis");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const seen = useInView(stageRef, { once: true, amount: 0.3 });
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  // "idle" until hydrated, so the first client render matches the server's.
  const phase: Phase = !hydrated ? "idle" : seen || reduce ? "play" : "armed";
  const baseId = useId();
  const tab = TOUR_TABS.find((t) => t.id === active) ?? TOUR_TABS[0];

  // Arrow keys move between tabs (WAI-ARIA tabs pattern, automatic activation).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TOUR_TABS.findIndex((t) => t.id === active);
    const last = TOUR_TABS.length - 1;
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % TOUR_TABS.length
        : e.key === "ArrowLeft"
          ? (i - 1 + TOUR_TABS.length) % TOUR_TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(TOUR_TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="tour" className={shared.darkSection} aria-labelledby="tour-title">
      <div className={cn(shared.darkPanel, styles.panel)}>
        <div className={shared.container}>
          <div className={cn(shared.sectionHead, shared.sectionHeadCenter)} data-reveal>
            <span className={shared.eyebrow}>Product tour</span>
            <h2 id="tour-title" className={shared.h2}>
              Your research desk, one tab at a time
            </h2>
            <p className={shared.lede}>
              Pick a tool to see the screen it gives you. Every number here is sample data.
            </p>
          </div>

          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Tools"
            onKeyDown={onKeyDown}
            data-reveal
          >
            {TOUR_TABS.map((t, i) => {
              const TabIcon = TAB_ICONS[t.id];
              const selected = t.id === active;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={`${baseId}-tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  className={styles.tab}
                  onClick={() => setActive(t.id)}
                >
                  {selected && (
                    <motion.span
                      layoutId="tour-pill"
                      className={styles.pill}
                      transition={reduce ? { duration: 0 } : { type: "spring", ...SPRING }}
                    />
                  )}
                  <TabIcon
                    className={styles.tabIcon}
                    size={18}
                    weight={selected ? "duotone" : "regular"}
                    aria-hidden="true"
                  />
                  <span className={styles.tabLabel}>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div
            ref={stageRef}
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${active}`}
            tabIndex={0}
            className={styles.stage}
            data-reveal
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                className={styles.slide}
                initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 1 } : { opacity: 0, y: -6, filter: "blur(6px)" }}
                transition={{ duration: reduce ? 0 : 0.32, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div className={styles.copy}>
                  <h3 className={styles.title}>{tab.title}</h3>
                  <p className={styles.body}>{tab.body}</p>
                  <div className={styles.actions}>
                    <Link className={cn(shared.btn, styles.primary)} href="/register">
                      Get started free
                      <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
                    </Link>
                    <a className={cn(shared.btn, styles.secondary)} href="#method">
                      See the method
                    </a>
                  </div>
                </div>

                <div className={styles.frame}>
                  <div className={styles.screen} data-phase={phase}>
                    {active === "analysis" && <DirectionScreen phase={phase} />}
                    {active === "market" && <AnalysisScreen phase={phase} />}
                    {active === "allocation" && <PortfolioScreen phase={phase} />}
                    {active === "journal" && <JournalScreen phase={phase} />}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- shared screen parts ---------- */

/**
 * Counts from zero once the tour is seen. Writes straight to the DOM so the
 * count doesn't re-render the screen, and pads with figure spaces so the
 * number keeps its final width and nothing beside it shifts.
 */
function CountUp({
  value,
  format,
  phase,
}: {
  value: number;
  format: (n: number) => string;
  phase: Phase;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const width = format(value).length;
    const write = (n: number) => {
      el.textContent = format(n).padStart(width, " ");
    };
    if (phase === "armed") {
      write(0);
      return;
    }
    if (phase !== "play") return;
    if (window.matchMedia(MQ_REDUCE).matches) {
      write(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: write,
    });
    return () => controls.stop();
  }, [phase, value, format]);

  return <span ref={ref}>{format(value)}</span>;
}

function ScreenHead({
  label,
  chips,
  active,
}: {
  label: string;
  chips?: string[];
  active?: string;
}) {
  return (
    <div className={styles.head}>
      <span className={styles.headLabel}>
        {label}
        <Info size={14} aria-hidden="true" />
      </span>
      {chips && (
        <span className={styles.chips} aria-hidden="true">
          {chips.map((c) => (
            <span key={c} data-on={c === active || undefined}>
              {c}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

const vars = (v: Record<string, string | number>) => v as CSSProperties;

/* ---------- screens ---------- */

function AnalysisScreen({ phase }: { phase: Phase }) {
  const above = LAST_PRICE > SMA_NOW;
  return (
    <>
      <ScreenHead label="RELIANCE, daily candles" chips={["1M", "3M", "6M", "1Y"]} active="3M" />
      <div className={styles.value}>
        <span className={styles.mark} aria-hidden="true">
          <CurrencyInr size={13} weight="bold" />
        </span>
        <b className={shared.num}>
          <CountUp value={LAST_PRICE} format={fmtPrice} phase={phase} />
        </b>
        <span className={cn(styles.delta, styles.up)}>+1.24% today</span>
      </div>

      <svg className={styles.chart} viewBox={`0 0 ${CW} ${CH}`} aria-hidden="true">
        {PRICE_TICKS.map((t) => (
          <g key={t}>
            <line
              className={styles.grid}
              x1={P.left}
              x2={CW - P.right}
              y1={priceY(t)}
              y2={priceY(t)}
            />
            <text className={styles.axis} x={P.left - 8} y={priceY(t) + 4} textAnchor="end">
              {fmtInt(t)}
            </text>
          </g>
        ))}
        {CANDLES.map((k, i) => (
          <rect
            key={`v${i}`}
            className={cn(styles.vol, i === CANDLES.length - 1 && styles.volNow)}
            x={cx(i) - BODY / 2}
            y={volY(k.v)}
            width={BODY}
            height={P.volBottom - volY(k.v)}
            rx={1.5}
            style={vars({ "--i": i })}
          />
        ))}
        {CANDLES.map((k, i) => {
          const top = priceY(Math.max(k.o, k.c));
          return (
            <g
              key={`c${i}`}
              className={cn(styles.candle, k.c >= k.o ? styles.candleUp : styles.candleDown)}
              style={vars({ "--i": i })}
            >
              <line x1={cx(i)} x2={cx(i)} y1={priceY(k.h)} y2={priceY(k.l)} />
              <rect
                x={cx(i) - BODY / 2}
                y={top}
                width={BODY}
                height={Math.max(1.5, priceY(Math.min(k.o, k.c)) - top)}
                rx={1}
              />
            </g>
          );
        })}
        <path className={styles.sma} d={SMA_PATH} pathLength={1} />
        {MONTHS.map((m) => (
          <text key={m.label} className={styles.axis} x={cx(m.i)} y={CH - 6} textAnchor="middle">
            {m.label}
          </text>
        ))}
      </svg>

      <ul className={styles.readings}>
        <li>
          <span>SMA 20</span>
          <b className={shared.num}>{fmtPrice(SMA_NOW)}</b>
          <em className={above ? styles.up : styles.down}>
            {above ? "Close above, bullish" : "Close below, bearish"}
          </em>
        </li>
        <li>
          <span>RSI 14</span>
          <b className={shared.num}>48.2</b>
          <em className={styles.flat}>Between 30 and 70</em>
        </li>
        <li>
          <span>MACD</span>
          <b className={shared.num}>Above 0</b>
          <em className={styles.up}>Bullish</em>
        </li>
      </ul>
    </>
  );
}

function DirectionScreen({ phase }: { phase: Phase }) {
  return (
    <>
      <ScreenHead label="RELIANCE, AI analysis" chips={["1D", "3D", "5D"]} active="3D" />
      <div className={styles.value}>
        <span className={styles.mark} aria-hidden="true">
          <ArrowUp size={13} weight="bold" />
        </span>
        <b>Leaning up, 3 days</b>
        <span className={cn(styles.delta, styles.up)}>
          <CountUp value={61} format={fmtPct} phase={phase} /> model confidence
        </span>
      </div>

      <svg className={styles.chart} viewBox={`0 0 ${DW} ${DH}`} aria-hidden="true">
        <defs>
          <linearGradient id="tour-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" className={styles.areaTop} />
            <stop offset="1" className={styles.areaBottom} />
          </linearGradient>
        </defs>
        {D_TICKS.map((t) => (
          <g key={t}>
            <line className={styles.grid} x1={D.left} x2={DW - 6} y1={dy(t)} y2={dy(t)} />
            <text className={styles.axis} x={D.left - 8} y={dy(t) + 4} textAnchor="end">
              {fmtInt(t)}
            </text>
          </g>
        ))}
        <path className={styles.area} d={AREA_PATH} fill="url(#tour-area)" />
        <path className={styles.line} d={LINE_PATH} pathLength={1} />
        <line className={styles.now} x1={NOW_X} x2={NOW_X} y1={D.top} y2={D.bottom} />
        <g className={styles.cone}>
          <path className={styles.coneFill} d={CONE_PATH} />
          <path className={styles.coneMid} d={MID_PATH} />
          <circle
            className={styles.coneEnd}
            cx={dx(RECENT.length - 1 + AHEAD)}
            cy={dy(RANGE[AHEAD].mid)}
            r={4}
          />
          <text
            className={styles.coneLabel}
            x={dx(RECENT.length - 1 + AHEAD) + 8}
            y={dy(RANGE[AHEAD].mid) + 4}
          >
            Expected range
          </text>
        </g>
        <circle className={styles.nowDot} cx={NOW_X} cy={dy(LAST_PRICE)} r={4.5} />
        <text className={styles.axis} x={NOW_X} y={DH - 4} textAnchor="middle">
          Today
        </text>
      </svg>

      <dl className={styles.cells}>
        <div>
          <dt>Confidence</dt>
          <dd className={shared.num}>
            <CountUp value={61} format={fmtPct} phase={phase} />
          </dd>
        </div>
        <div>
          <dt>Accuracy on unseen data</dt>
          <dd className={shared.num}>
            <CountUp value={57} format={fmtPct} phase={phase} />
          </dd>
        </div>
        <div>
          <dt>Horizon you chose</dt>
          <dd>3 days</dd>
        </div>
      </dl>
    </>
  );
}

function JournalScreen({ phase }: { phase: Phase }) {
  const max = Math.max(...TRADES.map(Math.abs));
  return (
    <>
      <ScreenHead label="Journal, last 14 trades" chips={["1M", "3M", "1Y"]} active="3M" />
      <div className={styles.value}>
        <span className={styles.mark} aria-hidden="true">
          <Notebook size={13} weight="bold" />
        </span>
        <b className={shared.num}>
          <CountUp value={58} format={fmtPct} phase={phase} />
          <small> win rate</small>
        </b>
        <span className={cn(styles.delta, styles.up)}>Profit factor 1.6</span>
      </div>

      <div className={styles.pnl} aria-hidden="true">
        {TRADES.map((t, i) => (
          <i
            key={i}
            data-down={t < 0 || undefined}
            style={vars({ "--i": i, "--h": `${(Math.abs(t) / max) * 100}%` })}
          />
        ))}
      </div>

      <ul className={styles.habits}>
        {HABITS.map((h, i) => (
          <li key={h.label} data-hot={h.hot || undefined} style={vars({ "--i": i })}>
            <span>{h.label}</span>
            <span className={styles.habitBar} aria-hidden="true">
              <i style={{ width: `${(h.count / HABITS[0].count) * 100}%` }} />
            </span>
            <b className={shared.num}>×{h.count}</b>
          </li>
        ))}
      </ul>

      <p className={styles.warning}>
        <WarningCircle size={18} weight="fill" aria-hidden="true" />
        Early exits are your most repeated mistake this quarter.
      </p>
    </>
  );
}

function PortfolioScreen({ phase }: { phase: Phase }) {
  return (
    <>
      <ScreenHead label="Portfolio, 5 holdings" />
      <div className={styles.value}>
        <span className={styles.mark} aria-hidden="true">
          <CurrencyInr size={13} weight="bold" />
        </span>
        <b className={shared.num}>
          <CountUp value={1245680} format={fmtRupees} phase={phase} />
        </b>
        <span className={cn(styles.delta, styles.up)}>+9.5% unrealized</span>
      </div>

      <div className={styles.stack} aria-hidden="true">
        {HOLDINGS.map((h, i) => (
          <i
            key={h.symbol}
            className={h.weight > LIMIT ? styles.stackOver : undefined}
            style={vars({ "--i": i, flexGrow: h.weight })}
          />
        ))}
      </div>

      <ul className={styles.holdings}>
        {HOLDINGS.map((h, i) => {
          const over = h.weight > LIMIT;
          return (
            <li key={h.symbol} style={vars({ "--i": i })}>
              <span className={styles.swatch} data-i={i} data-over={over || undefined} />
              <span className={styles.holding}>
                <b>{h.symbol}</b>
                <small>{h.sector}</small>
              </span>
              <span className={styles.holdingBar} aria-hidden="true">
                <i
                  data-i={i}
                  data-over={over || undefined}
                  style={{ width: `${(h.weight / HOLDINGS[0].weight) * 100}%` }}
                />
              </span>
              <b className={cn(shared.num, over && styles.overText)}>{h.weight.toFixed(1)}%</b>
            </li>
          );
        })}
      </ul>

      <p className={styles.warning}>
        <WarningCircle size={18} weight="fill" aria-hidden="true" />
        HDFCBANK is 34.2% of the portfolio, past your {LIMIT}% limit.
      </p>
    </>
  );
}
