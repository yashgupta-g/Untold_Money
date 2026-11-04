"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { POSITIONING } from "../../content";
import { IsoBox, type IsoView } from "../iso";
import styles from "./crew.module.css";
import { bricolage } from "./fonts";
import { HeroCtas } from "./parts";

/**
 * Anthropomorphic. Five tools as a small crew standing on a sunny field.
 * Their eyes follow the cursor, they wave when it's their turn, and they
 * take turns saying what they found.
 */

type Member = {
  id: string;
  name: string;
  role: string;
  status: "live" | "soon";
  line: string;
  /** Body colours: light, base and shade. */
  tone: [string, string, string];
  art: (fill: string) => ReactNode;
};

/** One eye: white, a pupil that tracks the cursor, and a lid that blinks. */
function Eye({ cx, cy, r = 11, lid }: { cx: number; cy: number; r?: number; lid: string }) {
  return (
    <g data-eye>
      <circle cx={cx} cy={cy} r={r} className={styles.white} />
      <circle cx={cx} cy={cy} r={r * 0.48} className={styles.pupil} />
      <circle cx={cx + r * 0.22} cy={cy - r * 0.26} r={r * 0.16} className={styles.glint} />
      <rect
        x={cx - r - 1}
        y={cy - r - 1}
        width={(r + 1) * 2}
        height={(r + 1) * 2}
        rx={r}
        className={styles.lid}
        style={{ fill: lid }}
      />
    </g>
  );
}

/** Stick legs with round shoes. */
const Legs = ({ x1, x2, top }: { x1: number; x2: number; top: number }) => (
  <g className={styles.limbs}>
    <path d={`M${x1} ${top}V186M${x2} ${top}V186`} />
    <ellipse cx={x1 - 4} cy="190" rx="11" ry="6" className={styles.shoe} />
    <ellipse cx={x2 + 4} cy="190" rx="11" ry="6" className={styles.shoe} />
  </g>
);

/** Arms from two shoulders; the right one waves while its owner speaks. */
const Arms = ({ l, r }: { l: [number, number]; r: [number, number] }) => (
  <g className={styles.limbs}>
    <path d={`M${l[0]} ${l[1]} q-16 6 -20 24`} />
    <circle cx={l[0] - 20} cy={l[1] + 26} r="5.5" className={styles.hand} />
    <g className={styles.wave} style={{ transformOrigin: `${r[0]}px ${r[1]}px` }}>
      <path d={`M${r[0]} ${r[1]} q18 -4 24 -22`} />
      <circle cx={r[0] + 25} cy={r[1] - 24} r="5.5" className={styles.hand} />
    </g>
  </g>
);

/** Closed smile at rest; opens while its owner is talking. */
const Smile = ({ cx, cy, w = 14 }: { cx: number; cy: number; w?: number }) => (
  <g>
    <path className={styles.closed} d={`M${cx - w / 2} ${cy} q${w / 2} ${w * 0.55} ${w} 0`} />
    <path
      className={styles.open}
      d={`M${cx - w / 2} ${cy - 1} h${w} q0 ${w * 0.7} ${-w / 2} ${w * 0.7} q${-w / 2} 0 ${-w / 2} ${-w * 0.7}z`}
    />
  </g>
);

/** Soft gloss on the upper left of every body, so they read as rounded. */
const Gloss = ({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} className={styles.gloss} />
);

const CREW: Member[] = [
  {
    id: "analyst",
    name: "Analyst",
    role: "AI stock analysis",
    status: "live",
    line: "I ran RELIANCE on your 3-day setup. Momentum is cooling; here's what moved the model.",
    tone: ["var(--crew-cobalt-light)", "var(--crew-cobalt)", "var(--crew-cobalt-deep)"],
    art: (fill) => (
      <>
        <Legs x1={66} x2={94} top={160} />
        <Arms l={[30, 118]} r={[130, 112]} />
        {/* A spark on a stalk: the AI. */}
        <line x1="80" y1="56" x2="80" y2="30" className={styles.wick} />
        <path
          d="M80 12l3.6 8.4L92 24l-8.4 3.6L80 36l-3.6-8.4L68 24l8.4-3.6z"
          className={styles.spark}
        />
        <circle cx="80" cy="110" r="56" fill={fill} />
        <Gloss cx={58} cy={80} rx={22} ry={13} />
        <Eye cx={66} cy={96} r={10} lid="var(--crew-cobalt)" />
        <Eye cx={94} cy={96} r={10} lid="var(--crew-cobalt)" />
        {/* Belly screen: a line the analyst is reading. */}
        <rect x="52" y="118" width="56" height="30" rx="8" className={styles.screen} />
        <path d="M58 140l10-6 8 4 10-12 8 4 8-8" className={styles.screenLine} />
      </>
    ),
  },
  {
    id: "data",
    name: "Data",
    role: "Market data",
    status: "live",
    line: "Prices, candles and volume for every stock you follow, refreshed every trading day.",
    tone: ["var(--crew-mint-light)", "var(--crew-mint)", "var(--crew-mint-deep)"],
    art: (fill) => (
      <>
        <Legs x1={70} x2={90} top={166} />
        <Arms l={[50, 108]} r={[110, 102]} />
        {/* A candlestick body, wick and all. */}
        <line x1="80" y1="58" x2="80" y2="26" className={styles.wick} />
        <rect x="50" y="56" width="60" height="114" rx="20" fill={fill} />
        <Gloss cx={64} cy={76} rx={9} ry={14} />
        <Eye cx={68} cy={92} r={10} lid="var(--crew-mint)" />
        <Eye cx={92} cy={92} r={10} lid="var(--crew-mint)" />
        <Smile cx={80} cy={113} w={12} />
        <g className={styles.bars}>
          <rect x="64" y="146" width="6" height="12" rx="2" />
          <rect x="74" y="138" width="6" height="20" rx="2" />
          <rect x="84" y="142" width="6" height="16" rx="2" />
        </g>
      </>
    ),
  },
  {
    id: "allocator",
    name: "Allocator",
    role: "Capital allocation",
    status: "live",
    line: "34% of your money sits in one stock. That's past the limit you set.",
    tone: ["var(--crew-sky-light)", "var(--crew-sky)", "var(--crew-sky-deep)"],
    art: (fill) => (
      <>
        <Legs x1={66} x2={94} top={162} />
        <Arms l={[30, 122]} r={[130, 118]} />
        <path d="M80 116 L80 62 A54 54 0 1 0 126.8 89 Z" fill={fill} />
        <path d="M80 116 L80 62 A54 54 0 0 1 126.8 89 Z" className={styles.slice} />
        <Gloss cx={56} cy={84} rx={18} ry={11} />
        <line x1="72" y1="104" x2="88" y2="104" className={styles.goggleBridge} />
        <Eye cx={58} cy={104} r={11} lid="var(--crew-sky)" />
        <Eye cx={101} cy={104} r={11} lid="var(--crew-sky)" />
        <circle cx="58" cy="104" r="14" className={styles.goggle} />
        <circle cx="101" cy="104" r="14" className={styles.goggle} />
        <Smile cx={80} cy={132} w={11} />
      </>
    ),
  },
  {
    id: "journal",
    name: "Journal",
    role: "Trade journal",
    status: "live",
    line: "You've sold early when nervous four times now. Want to see the pattern?",
    tone: ["var(--crew-sun-light)", "var(--crew-sun)", "var(--crew-sun-deep)"],
    art: (fill) => (
      <>
        <Legs x1={68} x2={96} top={168} />
        <Arms l={[44, 116]} r={[120, 110]} />
        <rect x="44" y="52" width="76" height="118" rx="12" fill={fill} />
        <rect x="44" y="52" width="14" height="118" rx="7" className={styles.spine} />
        {[136, 150].map((y) => (
          <line key={y} x1="66" x2="110" y1={y} y2={y} className={styles.ruled} />
        ))}
        <Gloss cx={74} cy={68} rx={14} ry={7} />
        <Eye cx={76} cy={94} r={10} lid="var(--crew-sun)" />
        <Eye cx={100} cy={94} r={10} lid="var(--crew-sun)" />
        <Smile cx={88} cy={116} w={12} />
      </>
    ),
  },
  {
    id: "wallet",
    name: "Wallet",
    role: "Broker trading",
    status: "live",
    line: "I send your orders to your broker, right from your workspace.",
    tone: ["var(--crew-coral-light)", "var(--crew-coral)", "var(--crew-coral-deep)"],
    art: (fill) => (
      <>
        <Legs x1={66} x2={94} top={166} />
        <Arms l={[36, 118]} r={[124, 112]} />
        {/* Hard hat: still under construction. */}
        <path d="M46 62a34 26 0 0 1 68 0z" className={styles.hat} />
        <rect x="40" y="60" width="80" height="7" rx="3.5" className={styles.hat} />
        {/* Wallet body with its flap and clasp. */}
        <rect x="36" y="66" width="88" height="102" rx="18" fill={fill} />
        <path d="M36 84h88v26a10 10 0 0 1-10 10H36z" className={styles.flap} />
        <circle cx="110" cy="102" r="6" className={styles.clasp} />
        <Gloss cx={56} cy={78} rx={14} ry={6} />
        <Eye cx={64} cy={136} r={10} lid="var(--crew-coral)" />
        <Eye cx={92} cy={136} r={10} lid="var(--crew-coral)" />
        <Smile cx={78} cy={156} w={10} />
      </>
    ),
  },
];

/*
 * Isometric pedestal each character stands on. Same 160-unit width as the
 * character art; the top face's centre (80, 44) sits under the feet.
 */
const PEDESTAL_VIEW: IsoView = { s: 41.6, ox: 80, oy: 2 };

function Pedestal({
  status,
  tone,
  id,
}: {
  status: Member["status"];
  tone: Member["tone"];
  id: string;
}) {
  const live = status === "live";
  return (
    <svg viewBox="0 0 160 100" className={styles.pedestal} aria-hidden="true">
      <defs>
        <linearGradient id={`ped-${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--bg-elev)" }} />
          <stop offset="1" style={{ stopColor: tone[0] }} />
        </linearGradient>
      </defs>
      <IsoBox
        view={PEDESTAL_VIEW}
        box={{ x: 0, y: 0, w: 2, d: 2, h: 0.3 }}
        faceClass={
          live
            ? { top: styles.pedTop, left: styles.pedLeft, right: styles.pedRight }
            : { top: styles.pedSoon, left: styles.pedSoon, right: styles.pedSoon }
        }
        style={
          live
            ? ({
                "--ped-top": `url(#ped-${id})`,
                "--ped-side": tone[1],
                "--ped-dark": tone[2],
              } as CSSProperties)
            : undefined
        }
      />
    </svg>
  );
}

/** Twinkles scattered over the field, in % of the panel. */
const SPARKS = [
  { x: 9, y: 62 },
  { x: 27, y: 55 },
  { x: 47, y: 60 },
  { x: 69, y: 54 },
  { x: 90, y: 61 },
  { x: 81, y: 38 },
];

const vars = (v: Record<string, string | number>) => v as CSSProperties;

export function HeroCrew() {
  const rootRef = useRef<HTMLElement>(null);
  const [speaker, setSpeaker] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const active = hovered ?? speaker;

  // Take turns speaking while nobody is being pointed at.
  useEffect(() => {
    if (reduce || hovered !== null) return;
    const id = window.setInterval(() => setSpeaker((s) => (s + 1) % CREW.length), 3600);
    return () => window.clearInterval(id);
  }, [reduce, hovered]);

  // Pupils lean toward the cursor and the clouds drift with it (CSS variables, no re-render).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduce) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = root.getBoundingClientRect();
        root.style.setProperty("--px", ((e.clientX - box.left) / box.width - 0.5).toFixed(3));
        root.querySelectorAll<SVGGElement>("[data-eye]").forEach((eye) => {
          const r = eye.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          const d = Math.hypot(dx, dy) || 1;
          const reach = Math.min(1, d / 160) * 4.5;
          eye.style.setProperty("--ex", `${((dx / d) * reach).toFixed(2)}px`);
          eye.style.setProperty("--ey", `${((dy / d) * reach).toFixed(2)}px`);
        });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduce]);

  return (
    <section
      ref={rootRef}
      id="top"
      className={cn(styles.hero, bricolage.variable)}
      data-nav="ink"
      aria-labelledby="hero-title"
    >
      <div className={styles.panel}>
        <Image
          src="/landing/heroes/field.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className={styles.photo}
        />
        <div className={styles.sun} aria-hidden="true" />
        <div className={styles.rays} aria-hidden="true" />
        <div className={styles.clouds} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>

        <div className={styles.copy}>
          <span className={styles.eyebrow}>{POSITIONING.eyebrow}</span>
          <h1 id="hero-title" className={styles.title}>
            Your money, with an AI team behind it.
          </h1>
          <p className={styles.lede}>
            An analyst, a data desk, an allocator, a journal and a trading desk, all working on
            your money in one place.
          </p>
          <HeroCtas className={styles.ctas} />
        </div>

        <div className={styles.sparks} aria-hidden="true">
          {SPARKS.map((s, i) => (
            <svg
              key={i}
              viewBox="0 0 20 20"
              style={vars({ left: `${s.x}%`, top: `${s.y}%`, "--i": i })}
            >
              <path d="M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z" />
            </svg>
          ))}
        </div>

        <ul className={styles.stage}>
          {CREW.map((m, i) => (
            <li
              key={m.id}
              className={styles.member}
              style={vars({ "--i": i, "--dir": i % 2 ? 1 : -1 })}
              data-active={active === i || undefined}
              data-status={m.status}
            >
              <p className={styles.bubble} aria-hidden={active !== i}>
                {m.line}
              </p>
              <button
                type="button"
                className={styles.character}
                aria-label={`${m.name}, ${m.role}: ${m.line}`}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              >
                <span className={styles.zoom} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <svg viewBox="0 0 160 200" className={styles.art} aria-hidden="true">
                  <defs>
                    <linearGradient id={`crew-${m.id}`} x1="0" x2="0.6" y1="0" y2="1">
                      <stop offset="0" style={{ stopColor: m.tone[0] }} />
                      <stop offset="0.55" style={{ stopColor: m.tone[1] }} />
                      <stop offset="1" style={{ stopColor: m.tone[2] }} />
                    </linearGradient>
                  </defs>
                  {m.art(`url(#crew-${m.id})`)}
                </svg>
                <span className={styles.shadow} aria-hidden="true" />
              </button>
              <Pedestal status={m.status} tone={m.tone} id={m.id} />
              <span className={styles.name}>
                <b>
                  {m.name}
                  {m.status === "soon" && <em>Soon</em>}
                </b>
                <small>{m.role}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
