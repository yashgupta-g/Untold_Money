import { ArrowUpRight, Check, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { seriesPaths } from "../chart-paths";
import styles from "../landing.module.css";
import { HOLDINGS, PhoneFrame, StockScreen } from "./PhoneMockups";

const SCORE_PARTS = [
  { label: "Trend", value: 68 },
  { label: "Momentum", value: 54 },
  { label: "Volatility", value: 65 },
  { label: "Volume", value: 50 },
];

const RSI_SERIES = [
  44, 47, 52, 49, 55, 58, 61, 57, 53, 50, 46, 42, 45, 48, 51, 54, 50, 47, 44, 41, 43, 46, 49, 52,
  50, 47, 45, 48, 50, 48.2,
];

// Hand-drawn connector arrows: a curve plus an open arrowhead at its end.
const ARROWS = [
  { className: styles.aL1, w: 64, h: 56, curve: "M60 50 C56 26 36 12 9 12", head: "M17 5 L9 12 L17 19" },
  { className: styles.aL3, w: 60, h: 66, curve: "M56 4 C54 34 36 54 9 58", head: "M16.5 51.5 L9 58 L17.5 62" },
  { className: styles.aR1, w: 64, h: 56, curve: "M4 50 C8 26 28 12 55 12", head: "M47 5 L55 12 L47 19" },
  { className: styles.aR3, w: 62, h: 72, curve: "M4 4 C34 6 52 30 52 62", head: "M45 55 L52 63 L59 55" },
];

export function HeroStage() {
  // RSI is plotted on its fixed 0-100 scale so the 30/70 guides sit where they belong.
  const rsi = seriesPaths(RSI_SERIES, 200, 54, 0, [0, 100]);
  const yFor = (v: number) => 54 - (v / 100) * 54;

  return (
    <div className={styles.stage}>
      {ARROWS.map((a) => (
        <svg
          key={a.curve}
          className={cn(styles.arrow, a.className)}
          width={a.w}
          height={a.h}
          viewBox={`0 0 ${a.w} ${a.h}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={a.curve} />
          <path d={a.head} />
        </svg>
      ))}

      <PhoneFrame
        className={styles.stagePhone}
        active="stocks"
        label="App preview with sample data: a stock screen with price chart, stock score of 63 (Buy) and indicator signals"
      >
        <StockScreen />
      </PhoneFrame>

      <div className={cn(styles.float, styles.floatWhite, styles.fL1)} aria-hidden="true">
        <div className={styles.floatTitle}>Built for NSE stocks</div>
        <span className={styles.floatRule} />
        <ul className={styles.checks}>
          {["Indicators & score", "ML direction", "Portfolio & journal"].map((item) => (
            <li key={item}>
              <span className={styles.checkIcon}>
                <Check size={12} strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className={cn(styles.float, styles.floatInk, styles.fL2)} aria-hidden="true">
        <div className={styles.floatLabel}>Stock score</div>
        <div className={styles.floatBig}>
          63<small> / 100 · Buy</small>
        </div>
        {SCORE_PARTS.map((part) => (
          <div key={part.label} className={styles.meter}>
            <span>{part.label}</span>
            <i>
              <b style={{ width: `${part.value}%` }} />
            </i>
            <em>{part.value}</em>
          </div>
        ))}
      </div>

      <div className={cn(styles.float, styles.floatWhite, styles.fL3)} aria-hidden="true">
        <div className={styles.floatLabel}>Trade journal</div>
        <div className={styles.floatBig}>
          58%<small> win rate</small>
        </div>
        <div className={styles.floatRow}>
          <span>Profit factor</span>
          <span className={styles.num}>1.6</span>
        </div>
        <div className={styles.floatRow}>
          <span>Top mistake</span>
          <span className={styles.floatChip}>Early exit</span>
        </div>
      </div>

      <div className={cn(styles.float, styles.floatBrand, styles.fR1)} aria-hidden="true">
        <div className={styles.floatLabel}>
          3-day direction <ArrowUpRight size={16} strokeWidth={2.5} />
        </div>
        <div className={styles.floatBig}>UP</div>
        <div className={styles.floatRow}>
          <span>Confidence</span>
          <span className={styles.num}>61%</span>
        </div>
        <div className={styles.floatRow}>
          <span>Validation accuracy</span>
          <span className={styles.num}>57%</span>
        </div>
      </div>

      <div className={cn(styles.float, styles.floatWhite, styles.fR2)} aria-hidden="true">
        <div className={styles.floatLabel}>Portfolio value</div>
        <div className={styles.floatBig}>₹12,45,680</div>
        <div className={styles.stackBar}>
          {HOLDINGS.map((h) => (
            <i key={h.label} style={{ width: `${h.pct}%`, background: h.color }} />
          ))}
        </div>
        <div className={styles.warnText}>
          <TriangleAlert size={13} strokeWidth={2.4} />
          Holding A is above 30%
        </div>
      </div>

      <div className={cn(styles.float, styles.floatInk, styles.fR3)} aria-hidden="true">
        <div className={styles.floatLabel}>
          RSI (14) <span className={styles.pillOnInk}>Neutral</span>
        </div>
        <div className={styles.floatBig}>48.2</div>
        <svg className={styles.sparkline} viewBox="0 0 200 54" preserveAspectRatio="none">
          {[30, 70].map((level) => (
            <line
              key={level}
              x1="0"
              x2="200"
              y1={yFor(level)}
              y2={yFor(level)}
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d={rsi.line}
            fill="none"
            stroke="#fcdb02"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}
