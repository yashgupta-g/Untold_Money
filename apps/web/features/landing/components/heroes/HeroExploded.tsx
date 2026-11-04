"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  Brain,
  ChartLineUp,
  ChartPieSlice,
  Notebook,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { POSITIONING } from "../../content";
import { IsoIcon } from "../IsoIcon";
import { MQ_MOTION } from "../../motion";
import styles from "./exploded.module.css";
import { mono } from "./fonts";
import { HeroCtas } from "./parts";

gsap.registerPlugin(ScrollTrigger);

/**
 * Exploded view. The platform drawn as a stack of five plates (market data,
 * AI analysis, capital allocation, journal, broker trading) that separates
 * on load and spreads further as you scroll, with data rising through it and
 * drawing-style callouts on each layer. The top layer is still being built.
 */

const LAYERS: { n: string; title: string; body: string; icon: Icon; soon?: boolean }[] = [
  {
    n: "01",
    title: "Market data",
    body: "Prices, candles and company data for NSE stocks.",
    icon: ChartLineUp,
  },
  {
    n: "02",
    title: "AI analysis",
    body: "ML models on the horizon and signals you choose.",
    icon: Brain,
  },
  {
    n: "03",
    title: "Capital allocation",
    body: "Holdings by stock and sector, against your limits.",
    icon: ChartPieSlice,
  },
  {
    n: "04",
    title: "Journal and review",
    body: "Every trade tagged by strategy, mistake and emotion.",
    icon: Notebook,
  },
  {
    n: "05",
    title: "Broker trading",
    body: "Connect your broker and place orders from your workspace.",
    icon: Wallet,
  },
];

/* Data packets rising through the stack: position on the plate (%) and delay. */
const PACKETS = [
  { x: 22, y: 30, d: 0 },
  { x: 64, y: 22, d: 0.5 },
  { x: 44, y: 58, d: 1 },
  { x: 78, y: 62, d: 1.5 },
  { x: 30, y: 74, d: 2 },
  { x: 56, y: 42, d: 2.5 },
];

/* Allocation donut on plate 03: weight, and whether it breaks the 30% limit. */
const ALLOC = [34.2, 21.4, 18.6, 14.1, 11.7];
const DONUT_C = 2 * Math.PI * 52;
/** Each segment's arc length and where it starts, computed once. */
const DONUT = ALLOC.map((w, i) => ({
  w,
  len: (DONUT_C * w) / 100 - 3,
  start: (DONUT_C * ALLOC.slice(0, i).reduce((a, b) => a + b, 0)) / 100,
}));

/* Mini candles for the bottom plate. */
const CANDLES = Array.from({ length: 22 }, (_, i) => {
  const base = 60 + Math.sin(i / 2.6) * 22 + i * 2.2;
  const up = Math.sin(i * 1.7) > -0.3;
  const body = 8 + Math.abs(Math.cos(i * 2.3)) * 16;
  return { x: 18 + i * 14.6, top: 170 - base - (up ? body : 0), body, up };
});

const GAP_CLOSED = 7;
const GAP_OPEN = 84;

const vars = (v: Record<string, string | number>) => v as CSSProperties;

export function HeroExploded() {
  const stageRef = useRef<HTMLDivElement>(null);
  const isoRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const iso = isoRef.current;
    const svg = linesRef.current;
    if (!stage || !iso || !svg) return;

    // Callout lines run from each plate's outer corner to its label.
    const drawLines = () => {
      const box = stage.getBoundingClientRect();
      const anchors = stage.querySelectorAll<HTMLElement>("[data-anchor]");
      const labels = stage.querySelectorAll<HTMLElement>("[data-label]");
      const paths = svg.querySelectorAll<SVGPathElement>("path");
      const dots = svg.querySelectorAll<SVGCircleElement>("circle");
      anchors.forEach((anchor, i) => {
        const a = anchor.getBoundingClientRect();
        const label = labels[i];
        const ax = a.left - box.left;
        const ay = a.top - box.top;
        label.style.top = `${ay}px`;
        const lx = label.getBoundingClientRect().left - box.left - 10;
        const elbow = ax + Math.max(16, (lx - ax) * 0.35);
        paths[i]?.setAttribute("d", `M${ax} ${ay} L${elbow} ${ay} L${lx} ${ay}`);
        dots[i]?.setAttribute("cx", String(ax));
        dots[i]?.setAttribute("cy", String(ay));
      });
    };

    const setGap = (gap: number) => {
      iso.style.setProperty("--gap", `${gap}px`);
      drawLines();
    };

    const mm = gsap.matchMedia();
    mm.add(MQ_MOTION, () => {
      const state = { gap: GAP_CLOSED, spread: 0 };
      const apply = () => setGap(state.gap + state.spread);
      apply();
      gsap
        .timeline({ delay: 0.5 })
        .to(state, { gap: GAP_OPEN, duration: 1.6, ease: "expo.inOut", onUpdate: apply })
        .add(() => stage.setAttribute("data-open", ""), 0.7);
      // Scrolling away pulls the layers further apart.
      gsap.to(state, {
        spread: 36,
        ease: "none",
        onUpdate: apply,
        scrollTrigger: { trigger: stage, start: "top top+=80", end: "bottom top", scrub: true },
      });
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      setGap(GAP_OPEN);
      stage.setAttribute("data-open", "");
    });

    const onResize = () => drawLines();
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(drawLines);
    return () => {
      mm.revert();
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
      <div className={styles.panel}>
        <Image
          src="/landing/heroes/arch.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className={styles.photo}
        />
        <div className={styles.blueprint} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>{POSITIONING.eyebrow}</span>
            <h1 id="hero-title" className={styles.title}>
              Your financial life, in one AI stack.
            </h1>
            <p className={styles.lede}>
              Market data at the base, AI analysis on top, then your portfolio and your journal.
              Trading through your broker is the next layer we&rsquo;re building.
            </p>
            <HeroCtas />
          </div>

          <div ref={stageRef} className={styles.stage}>
            <div className={styles.streaks} aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i} style={vars({ "--i": i })} />
              ))}
            </div>

            <div className={styles.scene} aria-hidden="true">
              <div ref={isoRef} className={styles.iso}>
                {/* A scan of light rising through the layers. */}
                <div className={styles.beam} />
                {PACKETS.map((p, i) => (
                  <i
                    key={i}
                    className={styles.packet}
                    style={vars({ left: `${p.x}%`, top: `${p.y}%`, "--d": `${p.d}s` })}
                  />
                ))}
                {LAYERS.map((layer, k) => (
                  <div
                    key={layer.n}
                    className={styles.plate}
                    data-k={k}
                    data-soon={layer.soon || undefined}
                    style={vars({ "--k": k })}
                  >
                    <PlateArt k={k} />
                    <span className={styles.plateTag}>{layer.n}</span>
                    <i className={styles.anchor} data-anchor />
                  </div>
                ))}
              </div>
            </div>

            <svg ref={linesRef} className={styles.lines} aria-hidden="true">
              {LAYERS.map((l) => (
                <g key={l.n}>
                  <path />
                  <circle r="3.5" />
                </g>
              ))}
            </svg>

            <ol className={styles.labels}>
              {LAYERS.map((l, k) => (
                <li key={l.n} data-label data-soon={l.soon || undefined}>
                  <IsoIcon
                    icon={l.icon}
                    tone={l.soon ? "soon" : k === 1 ? "cobalt" : "light"}
                    size={34}
                  />
                  <span>
                    <b>
                      {l.title}
                      {l.soon && <em>Soon</em>}
                    </b>
                    {l.body}
                  </span>
                </li>
              ))}
            </ol>

            <p className={styles.titleBlock}>
              <span>Platform assembly</span>
              <span>Sample data.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** What each plate carries, drawn flat on its face (360 × 240). */
function PlateArt({ k }: { k: number }) {
  if (k === 0) {
    return (
      <svg viewBox="0 0 360 240" className={styles.art}>
        {CANDLES.map((c, i) => (
          <g key={i} className={c.up ? styles.up : styles.down}>
            <line x1={c.x + 4} x2={c.x + 4} y1={c.top - 8} y2={c.top + c.body + 8} />
            <rect x={c.x} y={c.top} width="8" height={c.body} rx="1.5" />
          </g>
        ))}
        <text x="20" y="220" className={styles.plateText}>
          NSE market data
        </text>
      </svg>
    );
  }
  if (k === 1) {
    // A small network: inputs on the left, two hidden layers, one read out.
    const cols = [[50, 90, 130, 170], [70, 110, 150], [80, 140], [110]];
    const xs = [60, 140, 220, 300];
    return (
      <svg viewBox="0 0 360 240" className={styles.art}>
        {cols
          .slice(0, -1)
          .map((col, c) =>
            col.map((y1) =>
              cols[c + 1].map((y2) => (
                <line
                  key={`${c}-${y1}-${y2}`}
                  x1={xs[c]}
                  y1={y1}
                  x2={xs[c + 1]}
                  y2={y2}
                  className={styles.synapse}
                />
              )),
            ),
          )}
        {cols.map((col, c) =>
          col.map((y) => (
            <circle
              key={`${c}-${y}`}
              cx={xs[c]}
              cy={y}
              r={c === 3 ? 13 : 8}
              className={styles.neuron}
            />
          )),
        )}
        <text x="20" y="220" className={styles.plateTextLight}>
          Your setup: 3-day horizon
        </text>
      </svg>
    );
  }
  if (k === 2) {
    return (
      <svg viewBox="0 0 360 240" className={styles.art}>
        <g transform="translate(110 112) rotate(-90)">
          {DONUT.map((seg, i) => (
            <circle
              key={seg.w}
              r="52"
              className={i === 0 ? styles.donutOver : styles.donut}
              style={{ opacity: i === 0 ? 1 : 0.9 - i * 0.15 }}
              strokeDasharray={`${seg.len} ${DONUT_C}`}
              strokeDashoffset={-seg.start}
            />
          ))}
        </g>
        <text x="200" y="98" className={styles.allocBig}>
          34.2%
        </text>
        <text x="200" y="124" className={styles.plateText}>
          in one stock
        </text>
        <text x="200" y="146" className={styles.plateWarn}>
          Over your 30% limit
        </text>
        <text x="20" y="220" className={styles.plateText}>
          Capital allocation
        </text>
      </svg>
    );
  }
  if (k === 3) {
    return (
      <div className={styles.journal}>
        {[
          ["Breakout", "Calm", "+4.2%"],
          ["Pullback", "Early exit", "+0.8%"],
          ["Breakout", "FOMO", "−2.1%"],
        ].map(([strategy, tag, result]) => (
          <span key={strategy + tag}>
            <i>{strategy}</i>
            <i data-hot={tag === "Early exit" || undefined}>{tag}</i>
            <b data-down={result.startsWith("−") || undefined}>{result}</b>
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className={styles.trade}>
      <span>
        <i>Buy</i>
        <i>Sell</i>
      </span>
      <em>Broker connected</em>
    </div>
  );
}
