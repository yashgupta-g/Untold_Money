import { Database, Info, Prohibit, Sparkle } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";
import { INDICATORS, LIMITS, PARAMETERS } from "../content";
import shared from "../landing.module.css";
import styles from "./bento.module.css";
import { Tilt } from "./Tilt";

const LIMIT_ICONS = [Database, Sparkle, Prohibit];

// Sample RSI 14 that crosses both guide levels, to show the rule in action.
const RSI = [
  44, 47, 52, 58, 63, 69, 73, 71, 66, 60, 54, 48, 43, 38, 33, 29, 31, 36, 41, 45, 49, 53, 50, 47,
  45, 48, 51, 49, 47, 48.2,
];
const RSI_W = 600;
const RSI_H = 140;
const rsiX = (i: number) => (i / (RSI.length - 1)) * RSI_W;
// Plotted on 20–80 so the crossings read clearly.
const RSI_MIN = 20;
const RSI_MAX = 80;
const rsiPct = (v: number) => ((RSI_MAX - v) / (RSI_MAX - RSI_MIN)) * 100;
const rsiY = (v: number) => (rsiPct(v) / 100) * RSI_H;
const RSI_LINE = RSI.map(
  (v, i) => `${i ? "L" : "M"}${rsiX(i).toFixed(1)} ${rsiY(v).toFixed(1)}`,
).join(" ");

const MODEL_SPECS = [
  { label: "Model", value: "Gradient boosting" },
  { label: "Outputs", value: "Direction and expected range" },
  { label: "Minimum data", value: "80 daily candles" },
];

export function Bento() {
  return (
    <section id="open" className={shared.section}>
      <div className={shared.container}>
        <div className={cn(shared.sectionHead, shared.sectionHeadCenter)} data-reveal>
          <span className={shared.eyebrow}>Open by design</span>
          <h2 className={shared.h2}>Built to be read, not trusted blindly</h2>
          <p className={shared.lede}>
            Every output lists the values behind it, using rules you can inspect.
          </p>
        </div>

        <div className={styles.bento}>
          <Tilt className={styles.areaIndicators} max={3}>
            <div className={styles.tile} data-reveal="mask">
              <h3 className={shared.h3}>Indicators</h3>
              <p className={styles.tileSub}>The exact rules the app applies to daily candles.</p>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Indicator</th>
                    <th>Signal rule</th>
                    <th className={styles.right}>Candles</th>
                  </tr>
                </thead>
                <tbody>
                  {INDICATORS.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.rule}</td>
                      <td className={cn(styles.right, shared.num)}>{row.candles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <figure className={styles.chart}>
                <figcaption>
                  <span>RSI 14 on sample data</span>
                  <span>Above 70 reads bearish, below 30 bullish</span>
                </figcaption>
                <div className={styles.chartBox}>
                  <svg
                    viewBox={`0 0 ${RSI_W} ${RSI_H}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="rsi-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" style={{ stopColor: "var(--ink)", stopOpacity: 0.08 }} />
                        <stop offset="1" style={{ stopColor: "var(--ink)", stopOpacity: 0 }} />
                      </linearGradient>
                    </defs>
                    <rect
                      x="0"
                      y={rsiY(70)}
                      width={RSI_W}
                      height={rsiY(30) - rsiY(70)}
                      style={{ fill: "var(--bg-muted)" }}
                    />
                    {[70, 30].map((level) => (
                      <line
                        key={level}
                        x1="0"
                        x2={RSI_W}
                        y1={rsiY(level)}
                        y2={rsiY(level)}
                        style={{ stroke: "var(--line-strong)" }}
                        strokeDasharray="4 6"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                    <path
                      d={`${RSI_LINE} L${RSI_W} ${RSI_H} L0 ${RSI_H} Z`}
                      fill="url(#rsi-fill)"
                    />
                    <path
                      d={RSI_LINE}
                      fill="none"
                      style={{ stroke: "var(--ink)" }}
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span className={styles.level} style={{ top: `${rsiPct(70)}%` }}>
                    70
                  </span>
                  <span className={styles.level} style={{ top: `${rsiPct(30)}%` }}>
                    30
                  </span>
                  <span
                    className={styles.endDot}
                    style={{ top: `${rsiPct(RSI[RSI.length - 1])}%` }}
                  />
                </div>
              </figure>
              <p className={styles.note}>
                <Info size={16} weight="duotone" aria-hidden="true" />
                An indicator reports only once a stock has the candles shown, so a new listing shows
                fewer signals instead of guessed ones.
              </p>
            </div>
          </Tilt>

          <Tilt className={styles.areaParams}>
            <div className={styles.tile} data-reveal="mask">
              <h3 className={shared.h3}>Your parameters</h3>
              <p className={styles.tileSub}>You set the question. The models answer that one.</p>
              <ul className={styles.list}>
                {PARAMETERS.map((p) => (
                  <li key={p.label}>
                    <span>{p.label}</span>
                    <span>{p.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Tilt>

          <Tilt className={styles.areaModel}>
            <div className={cn(styles.tile, styles.tileAccent)} data-reveal="mask">
              <h3 className={shared.h3}>ML models</h3>
              <p className={styles.tileSub}>
                Each read comes with its confidence and its accuracy on data it never saw.
              </p>
              <ul className={styles.list}>
                {MODEL_SPECS.map((s) => (
                  <li key={s.label}>
                    <span>{s.label}</span>
                    <span>{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Tilt>

          <div className={cn(styles.tile, styles.areaLimits)} data-reveal="mask">
            <h3 className={shared.h3}>Data and limits</h3>
            <ul className={styles.limits}>
              {LIMITS.map((limit, i) => {
                const Icon = LIMIT_ICONS[i];
                return (
                  <li key={limit.title}>
                    <span className={styles.limitIcon}>
                      <Icon size={20} weight="duotone" aria-hidden="true" />
                    </span>
                    <b>{limit.title}</b>
                    <span>{limit.body}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
