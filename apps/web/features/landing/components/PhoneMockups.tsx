import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BatteryFull,
  ChartLine,
  ChartPie,
  NotebookPen,
  Plus,
  Signal,
  Star,
  TriangleAlert,
  User,
  Wifi,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { donutSegments, seriesPaths } from "../chart-paths";
import styles from "../phone.module.css";

type Tab = "stocks" | "portfolio" | "journal";

const TABS: { id: Tab | "profile"; label: string; Icon: typeof ChartLine }[] = [
  { id: "stocks", label: "Stocks", Icon: ChartLine },
  { id: "portfolio", label: "Portfolio", Icon: ChartPie },
  { id: "journal", label: "Journal", Icon: NotebookPen },
  { id: "profile", label: "Profile", Icon: User },
];

/** A phone frame. The whole mockup is exposed to assistive tech as one image. */
export function PhoneFrame({
  label,
  active,
  className,
  children,
}: {
  label: string;
  active: Tab;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(styles.phone, className)} role="img" aria-label={label}>
      <div className={styles.screen}>
        <span className={styles.island} />
        <div className={styles.status}>
          <span>9:41</span>
          <span className={styles.statusIcons}>
            <Signal size={13} strokeWidth={2.5} />
            <Wifi size={13} strokeWidth={2.5} />
            <BatteryFull size={17} strokeWidth={2} />
          </span>
        </div>
        {children}
        <div className={styles.tabBar}>
          {TABS.map(({ id, label: tabLabel, Icon }) => (
            <span key={id} className={cn(styles.tab, id === active && styles.tabActive)}>
              <Icon size={18} strokeWidth={id === active ? 2.4 : 1.8} />
              {tabLabel}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Stock analysis screen ---

const PRICE_SERIES = [
  2380, 2372, 2391, 2388, 2402, 2396, 2410, 2405, 2398, 2415, 2422, 2418, 2430, 2426, 2412,
  2420, 2435, 2441, 2437, 2450, 2446, 2455, 2449, 2462, 2458, 2466, 2471, 2463, 2474, 2480.5,
];

const SCORE = 63;
const RING_RADIUS = 22;

export function StockScreen() {
  const chart = seriesPaths(PRICE_SERIES, 248, 104, 6);
  const circumference = 2 * Math.PI * RING_RADIUS;

  return (
    <>
      <div className={styles.appBar}>
        <span className={styles.iconBtn}>
          <ArrowLeft size={15} />
        </span>
        <div className={styles.grow}>
          <div className={styles.appTitle}>ACME</div>
          <div className={styles.appSub}>Sample stock · NSE</div>
        </div>
        <span className={styles.iconBtn}>
          <Star size={14} />
        </span>
      </div>

      <div className={styles.body}>
        <div>
          <div className={styles.bigValue}>₹2,480.50</div>
          <div className={styles.row}>
            <span className={cn(styles.up, styles.num)}>+₹100.50 (4.22%)</span>
            <span className={cn(styles.pill, styles.pillMuted)}>1 month</span>
          </div>
        </div>

        <svg className={styles.chart} viewBox="0 0 248 104" aria-hidden="true">
          <defs>
            <linearGradient id="um-stock-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fcdb02" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#fcdb02" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={chart.area} fill="url(#um-stock-fill)" />
          <path
            d={chart.line}
            fill="none"
            stroke="#14130f"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={chart.last.x} cy={chart.last.y} r="4.5" fill="#fcdb02" stroke="#14130f" strokeWidth="2" />
        </svg>

        <div className={styles.scoreCard}>
          <div className={styles.ring}>
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r={RING_RADIUS} fill="none" stroke="#e6e2d6" strokeWidth="6" />
              <circle
                cx="26"
                cy="26"
                r={RING_RADIUS}
                fill="none"
                stroke="#fcdb02"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(SCORE / 100) * circumference} ${circumference}`}
              />
            </svg>
            <span className={styles.ringValue}>{SCORE}</span>
          </div>
          <div className={styles.grow}>
            <div className={styles.row}>
              <span className={styles.listName}>Stock score</span>
              <span className={cn(styles.pill, styles.pillBrand)}>Buy</span>
            </div>
            <div className={styles.listMeta}>Trend · Momentum · Volatility · Volume</div>
          </div>
        </div>

        <div className={styles.list}>
          <IndicatorRow name="SMA 20" meta="Close above" signal="Bullish" />
          <IndicatorRow name="RSI 14" meta="48.2" signal="Neutral" />
          <IndicatorRow name="MACD" meta="+1.24" signal="Bullish" />
        </div>
      </div>
    </>
  );
}

function IndicatorRow({
  name,
  meta,
  signal,
}: {
  name: string;
  meta: string;
  signal: "Bullish" | "Neutral";
}) {
  return (
    <div className={styles.listRow}>
      <div>
        <div className={styles.listName}>{name}</div>
        <div className={cn(styles.listMeta, styles.num)}>{meta}</div>
      </div>
      <span
        className={cn(
          styles.pill,
          styles.listEnd,
          signal === "Bullish" ? styles.pillGood : styles.pillMuted,
        )}
      >
        {signal === "Bullish" && <ArrowUpRight size={10} strokeWidth={3} />}
        {signal}
      </span>
    </div>
  );
}

// --- Portfolio screen ---

export const HOLDINGS = [
  { label: "A", pct: 34, value: "₹4,23,531", color: "#fcdb02" },
  { label: "B", pct: 24, value: "₹2,98,963", color: "#14130f" },
  { label: "C", pct: 18, value: "₹2,24,222", color: "#4a4740" },
  { label: "D", pct: 14, value: "₹1,74,395", color: "#8a877e" },
  { label: "E", pct: 10, value: "₹1,24,568", color: "#c9c5ba" },
];

const DONUT_RADIUS = 38;

export function PortfolioScreen() {
  const segments = donutSegments(
    HOLDINGS.map((h) => h.pct),
    DONUT_RADIUS,
  );

  return (
    <>
      <div className={styles.appBar}>
        <div className={styles.grow}>
          <div className={styles.appTitle}>Portfolio</div>
          <div className={styles.appSub}>Long-term · 5 holdings</div>
        </div>
        <span className={styles.iconBtn}>
          <Plus size={15} />
        </span>
      </div>

      <div className={styles.body}>
        <div>
          <div className={styles.label}>Current value</div>
          <div className={styles.bigValue}>₹12,45,680</div>
          <div className={styles.split}>
            <span>
              Invested<b className={styles.num}>₹11,43,340</b>
            </span>
            <span>
              Unrealized P&amp;L<b className={cn(styles.up, styles.num)}>+₹1,02,340</b>
            </span>
          </div>
        </div>

        <div className={styles.donutWrap}>
          <div className={styles.donut}>
            <svg width="96" height="96" viewBox="0 0 96 96">
              {HOLDINGS.map((h, i) => (
                <circle
                  key={h.label}
                  cx="48"
                  cy="48"
                  r={DONUT_RADIUS}
                  fill="none"
                  stroke={h.color}
                  strokeWidth="14"
                  strokeDasharray={segments[i].dashArray}
                  strokeDashoffset={segments[i].dashOffset}
                />
              ))}
            </svg>
            <span className={styles.donutCenter}>
              <b>5</b>holdings
            </span>
          </div>
          <div className={styles.legend}>
            {HOLDINGS.map((h) => (
              <span key={h.label}>
                <i style={{ background: h.color }} />
                Holding {h.label}
                <em>{h.pct}%</em>
              </span>
            ))}
          </div>
        </div>

        <div className={styles.warn}>
          <TriangleAlert size={13} strokeWidth={2.4} />
          <span>
            <b>Holding A is 34%</b> of portfolio value, above the 30% concentration threshold.
          </span>
        </div>

        <div className={styles.list}>
          {HOLDINGS.slice(0, 3).map((h) => (
            <div key={h.label} className={styles.listRow}>
              <span className={cn(styles.avatar, h.label === "A" && styles.avatarBrand)}>
                {h.label}
              </span>
              <div>
                <div className={styles.listName}>Holding {h.label}</div>
                <div className={styles.listMeta}>{h.pct}% of value</div>
              </div>
              <span className={cn(styles.listEnd, styles.listName, styles.num)}>{h.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// --- Trade journal screen ---

const EQUITY_SERIES = [0, 0.4, 0.2, 0.9, 1.4, 1.1, 1.8, 1.6, 2.4, 2.1, 2.9, 3.4, 3.1, 3.8, 4.1];

const JOURNAL_TRADES = [
  { side: "Buy", name: "Stock A", pnl: "+₹3,420", good: true, tags: ["Breakout", "Confident"] },
  { side: "Sell", name: "Stock B", pnl: "−₹640", good: false, tags: ["Early exit", "Fearful"] },
  { side: "Buy", name: "Stock C", pnl: "+₹1,180", good: true, tags: ["Pullback", "Neutral"] },
  { side: "Sell", name: "Stock D", pnl: "−₹210", good: false, tags: ["Chased entry", "FOMO"] },
];

export function JournalScreen() {
  const equity = seriesPaths(EQUITY_SERIES, 248, 46, 3);

  return (
    <>
      <div className={styles.appBar}>
        <div className={styles.grow}>
          <div className={styles.appTitle}>Trade journal</div>
          <div className={styles.appSub}>Last 30 days · 24 trades</div>
        </div>
        <span className={styles.iconBtn}>
          <Plus size={15} />
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.statGrid}>
          <div className={cn(styles.stat, styles.statBrand)}>
            <span className={styles.label}>Win rate</span>
            <b>58%</b>
          </div>
          <div className={styles.stat}>
            <span className={styles.label}>Profit factor</span>
            <b>1.6</b>
          </div>
          <div className={styles.stat}>
            <span className={styles.label}>Expectancy</span>
            <b>+₹412</b>
          </div>
        </div>

        <svg className={styles.chart} style={{ height: 46 }} viewBox="0 0 248 46" aria-hidden="true">
          <defs>
            <linearGradient id="um-journal-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fcdb02" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fcdb02" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={equity.area} fill="url(#um-journal-fill)" />
          <path d={equity.line} fill="none" stroke="#14130f" strokeWidth="2" strokeLinejoin="round" />
        </svg>

        <div className={styles.list}>
          {JOURNAL_TRADES.map((t) => (
            <div key={t.name} className={styles.listRow}>
              <div className={styles.grow}>
                <div className={styles.row}>
                  <span className={styles.listName}>
                    {t.side} · {t.name}
                  </span>
                  <span className={cn(t.good ? styles.up : styles.down, styles.num)}>{t.pnl}</span>
                </div>
                <div className={styles.tags}>
                  {t.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(styles.pill, tag === "Early exit" ? styles.pillWarn : styles.pillMuted)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
