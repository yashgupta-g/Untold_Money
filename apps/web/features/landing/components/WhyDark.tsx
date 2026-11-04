import type { CSSProperties } from "react";
import {
  Bell,
  Brain,
  ChartLineUp,
  ChartPieSlice,
  EnvelopeSimple,
  SlidersHorizontal,
  DeviceMobile,
} from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";
import shared from "../landing.module.css";
import { Traces, type Trace } from "./Traces";
import styles from "./why.module.css";

/*
 * Hub artboard (560×360): four inputs feed the analysis. Node and tile boxes are
 * placed in % of the artboard so they line up with the SVG traces at any width.
 */
const HUB = { width: 560, height: 360 };
const NODES = [
  { id: "trend", label: "Market data", icon: ChartLineUp, x: 40, y: 50 },
  { id: "momentum", label: "Your parameters", icon: SlidersHorizontal, x: 40, y: 254 },
  { id: "volatility", label: "ML models", icon: Brain, x: 464, y: 50 },
  { id: "volume", label: "Your holdings", icon: ChartPieSlice, x: 464, y: 254 },
];
const NODE = 56;
const CORE = { x: 196, y: 116, w: 168, h: 128 };
const HUB_TRACES: Trace[] = [
  {
    id: "trend",
    points: [
      [96, 78],
      [150, 78],
      [150, 156],
      [196, 156],
    ],
  },
  {
    id: "momentum",
    points: [
      [96, 282],
      [150, 282],
      [150, 204],
      [196, 204],
    ],
  },
  {
    id: "volatility",
    points: [
      [464, 78],
      [410, 78],
      [410, 156],
      [364, 156],
    ],
  },
  {
    id: "volume",
    points: [
      [464, 282],
      [410, 282],
      [410, 204],
      [364, 204],
    ],
  },
];

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

const TAGS = [
  { label: "Breakout", x: 6, y: 18, r: -6 },
  { label: "Pullback", x: 52, y: 12, r: 5 },
  { label: "FOMO", x: 2, y: 46, r: 0 },
  { label: "Early exit", x: 26, y: 44, r: 0, hot: true },
  { label: "Confident", x: 64, y: 46, r: 0 },
  { label: "Oversized", x: 14, y: 72, r: 4 },
  { label: "Mean reversion", x: 48, y: 74, r: -5 },
];

/** Dark glow bento: why the numbers can be trusted. */
export function WhyDark() {
  return (
    <section className={shared.darkSection} aria-labelledby="why-title">
      <div className={shared.darkPanel}>
        <div className={shared.container}>
          <div className={cn(shared.sectionHead, shared.sectionHeadCenter)} data-reveal>
            <span className={shared.eyebrow}>Why UntoldMoney</span>
            <h2 id="why-title" className={shared.h2}>
              Numbers you can check.
              <br />
              Models you can question.
            </h2>
            <p className={shared.lede}>
              Every output lists the inputs and rules behind it, so you decide how much weight to
              give it.
            </p>
          </div>

          <div className={styles.grid}>
            <article className={cn(shared.darkCard, styles.stat, styles.a)} data-reveal>
              <b className={shared.num} data-count="80">
                80
              </b>
              <span>Daily candles before any prediction</span>
            </article>

            <article className={cn(shared.darkCardPlain, styles.tags, styles.b)} data-reveal>
              <div className={styles.cloud} aria-hidden="true">
                {TAGS.map((t) => (
                  <span
                    key={t.label}
                    className={cn(styles.tag, t.hot && styles.tagHot)}
                    style={{ left: `${t.x}%`, top: `${t.y}%`, "--r": `${t.r}deg` } as CSSProperties}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
              <p>Every trade tagged by strategy, mistake and emotion, so patterns surface.</p>
            </article>

            <article className={cn(shared.darkCardPlain, styles.hubCard, styles.c)} data-reveal>
              <h3 className={styles.hubTitle}>
                One analyst. Your rules.
                <br />
                Every input visible.
              </h3>
              <p>
                Market data, the horizon and signals you pick, the ML models and your own holdings
                all feed the analysis, and each result lists what it used.
              </p>
              <div
                className={styles.hub}
                style={{ aspectRatio: `${HUB.width} / ${HUB.height}` }}
                aria-hidden="true"
              >
                <Traces traces={HUB_TRACES} width={HUB.width} height={HUB.height} />
                {NODES.map((n) => (
                  <div
                    key={n.id}
                    className={styles.node}
                    style={{
                      left: pct(n.x, HUB.width),
                      top: pct(n.y, HUB.height),
                      width: pct(NODE, HUB.width),
                    }}
                  >
                    <span className={styles.nodeIcon}>
                      <n.icon size={20} weight="duotone" />
                    </span>
                    <span className={styles.nodeLabel}>{n.label}</span>
                  </div>
                ))}
                <div
                  className={styles.core}
                  style={{
                    left: pct(CORE.x, HUB.width),
                    top: pct(CORE.y, HUB.height),
                    width: pct(CORE.w, HUB.width),
                    height: pct(CORE.h, HUB.height),
                  }}
                >
                  <span className={styles.coreMark}>
                    <svg width="18" height="18" viewBox="0 0 26 26">
                      <path d="M2 10 10 2h6L2 16zM24 16l-8 8h-6l14-14z" fill="currentColor" />
                    </svg>
                  </span>
                  <b>AI</b>
                  <span>Your analysis</span>
                </div>
              </div>
            </article>

            <article className={cn(shared.darkCardPlain, styles.alerts, styles.d)} data-reveal>
              <div className={styles.alertUi} aria-hidden="true">
                <p>
                  <b>ITC: RSI 14 crossed above 70</b> and closed at 71.4. This alert fired because
                  of <b>your rule</b>: RSI 14 above 70.
                </p>
                <div className={styles.alertFoot}>
                  <span>
                    <DeviceMobile size={14} /> In app
                  </span>
                  <span>
                    <EnvelopeSimple size={14} /> Email
                  </span>
                  <span className={styles.alertBell}>
                    <Bell size={14} weight="fill" />
                  </span>
                </div>
              </div>
              <p>
                Alerts reach you in the app and by email, and each one names the rule that fired.
              </p>
            </article>

            <article className={cn(shared.darkCard, styles.stat, styles.e)} data-reveal>
              <b className={shared.num} data-count="30">
                30<span>%</span>
              </b>
              <span>One holding past this triggers a warning</span>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
