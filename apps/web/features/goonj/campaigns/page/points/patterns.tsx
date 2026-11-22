import type { ReactNode } from "react";

import type { Kind } from "./graphics";
import p from "./patterns.module.css";

/**
 * Generative art for the "Why join early" cards: one pattern per point, drawn
 * as SVG in Goonj's colours (orange light on deep dark). Deterministic, so
 * server and client draw the same thing. viewBox 800×520 (the card's shape);
 * "slice" crops it on taller phone cards.
 */

const W = 800;
const H = 520;
const O = "#f47220";

/** Rounds to 2 decimals, so server and browser maths print identical markup. */
const n2 = (v: number) => Math.round(v * 100) / 100;

/** Small seeded random, so the art is the same on every render. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Svg({ children, id }: { children: ReactNode; id: string }) {
  return (
    <svg className={p.svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={O} stopOpacity="0.55" />
          <stop offset="100%" stopColor={O} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-bloom`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {children}
    </svg>
  );
}

/** One of the few: a vast field of dim dots, only a few of them lit. */
function Few() {
  const r = rng(7);
  const dots: ReactNode[] = [];
  const lit = new Set([4 * 40 + 27, 7 * 40 + 31, 9 * 40 + 24, 5 * 40 + 34, 11 * 40 + 29]);
  for (let row = 0; row < 26; row++) {
    for (let col = 0; col < 40; col++) {
      const x = 10 + col * 20;
      const y = 10 + row * 20;
      const i = row * 40 + col;
      const d = Math.hypot(x - 560, y - 160) / 520;
      const rad = 1.1 + 1.9 * Math.max(0, 1 - d) + r() * 0.3;
      if (lit.has(i)) {
        dots.push(
          <g key={i} className={p.lit} style={{ ["--d" as string]: `${(i % 5) * -0.7}s` }}>
            <circle cx={x} cy={y} r={16} fill="url(#few-glow)" />
            <circle cx={x} cy={y} r={4.2} fill={O} filter="url(#few-bloom)" />
          </g>,
        );
      } else {
        dots.push(<circle key={i} cx={x} cy={y} r={n2(rad)} fill="rgba(250,248,245,0.16)" />);
      }
    }
  }
  return <Svg id="few">{dots}</Svg>;
}

/** Here for a reason: fingerprint-like contour rings, each one unique. */
function Reason() {
  const rings: ReactNode[] = [];
  const cx = 590;
  const cy = 190;
  for (let k = 1; k <= 26; k++) {
    const base = 10 + k * 15;
    let d = "";
    for (let a = 0; a <= 360; a += 4) {
      const t = (a * Math.PI) / 180;
      const wob = Math.sin(t * 3 + k * 0.55) * (2 + k * 0.45) + Math.sin(t * 5 - k * 0.3) * 1.6;
      const rx = (base + wob) * 1.08;
      const ry = (base + wob) * 1.28;
      const x = cx + rx * Math.cos(t);
      const y = cy + ry * Math.sin(t);
      d += `${a ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    rings.push(
      <path
        key={k}
        d={`${d}Z`}
        fill="none"
        stroke={O}
        strokeWidth={1.4}
        strokeOpacity={n2(Math.max(0.08, 0.85 - k * 0.03))}
        strokeDasharray={k % 4 === 0 ? "18 9" : undefined}
      />,
    );
  }
  return (
    <Svg id="reason">
      <circle cx={cx} cy={cy} r={140} fill="url(#reason-glow)" />
      <g className={p.turn} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {rings}
      </g>
      <circle cx={cx} cy={cy} r={5} fill="#ffd9bb" filter="url(#reason-bloom)" />
    </Svg>
  );
}

/** Discover it early: a striped sun rising over horizon lines. */
function Early() {
  const lines: ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const y = n2(300 + Math.pow(i, 1.6) * 6);
    lines.push(<line key={i} x1={0} x2={W} y1={y} y2={y} stroke={O} strokeOpacity={n2(0.12 + i * 0.03)} strokeWidth={1} />);
  }
  const slits: ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    const y = 190 + i * 18;
    slits.push(<rect key={i} x={0} y={y} width={W} height={n2(2 + i * 1.6)} fill="#000" />);
  }
  return (
    <Svg id="early">
      <defs>
        <linearGradient id="early-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd2a8" />
          <stop offset="55%" stopColor={O} />
          <stop offset="100%" stopColor="#a8420c" />
        </linearGradient>
        <mask id="early-cut">
          <rect width={W} height={H} fill="#fff" />
          {slits}
        </mask>
      </defs>
      <circle cx={560} cy={300} r={260} fill="url(#early-glow)" />
      <g className={p.rise}>
        <circle cx={560} cy={300} r={150} fill="url(#early-sun)" mask="url(#early-cut)" />
      </g>
      <rect x={0} y={300} width={W} height={H - 300} fill="#07090a" />
      {lines}
    </Svg>
  );
}

/** Your feedback matters: a voice waveform, gently alive. */
function Feedback() {
  const bars: ReactNode[] = [];
  const n = 56;
  const gap = W / n;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const env = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.18) / 0.82)));
    const h = n2(10 + env * (110 * Math.abs(Math.sin(i * 0.55)) + 60 * Math.abs(Math.sin(i * 0.21 + 1))));
    const x = n2(i * gap + gap / 2);
    bars.push(
      <rect
        key={i}
        className={p.bar}
        x={n2(x - 3)}
        y={n2(210 - h / 2)}
        width={6}
        height={h}
        rx={3}
        fill="url(#feedback-bar)"
        style={{ ["--d" as string]: `${(i % 9) * -0.18}s`, transformOrigin: `${x}px 210px` }}
      />,
    );
  }
  return (
    <Svg id="feedback">
      <defs>
        <linearGradient id="feedback-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd2a8" />
          <stop offset="50%" stopColor={O} />
          <stop offset="100%" stopColor="#7a2a08" />
        </linearGradient>
      </defs>
      <ellipse cx={520} cy={210} rx={300} ry={130} fill="url(#feedback-glow)" />
      {bars}
      <line x1={0} x2={W} y1={210} y2={210} stroke="rgba(255,210,170,0.25)" strokeWidth={1} />
    </Svg>
  );
}

/** Closer to the team: rings drawing in and overlapping, glowing where they meet. */
function Team() {
  const cx = 500;
  const cy = 200;
  const ring = (a: number, i: number) => {
    const t = (a * Math.PI) / 180;
    return (
      <circle
        key={i}
        className={p.draw}
        cx={n2(cx + Math.cos(t) * 70)}
        cy={n2(cy + Math.sin(t) * 70)}
        r={110}
        fill={i % 2 ? "rgba(0,120,110,0.07)" : "rgba(244,114,32,0.07)"}
        stroke={i % 2 ? "rgba(70,190,175,0.55)" : O}
        strokeOpacity={i % 2 ? 1 : 0.8}
        strokeWidth={1.4}
        style={{ ["--a" as string]: `${a}deg`, transformOrigin: `${cx}px ${cy}px` }}
      />
    );
  };
  return (
    <Svg id="team">
      <circle cx={cx} cy={cy} r={170} fill="url(#team-glow)" />
      {[0, 72, 144, 216, 288].map(ring)}
      <circle cx={cx} cy={cy} r={6} fill="#ffd9bb" filter="url(#team-bloom)" />
    </Svg>
  );
}

/** Part of what comes next: a perspective grid running to a bright horizon. */
function Next() {
  const vx = 560;
  const vy = 190;
  const rays: ReactNode[] = [];
  for (let i = -14; i <= 14; i++) {
    rays.push(
      <line key={i} x1={vx} y1={vy} x2={vx + i * 90} y2={H} stroke={O} strokeOpacity={n2(0.35 - Math.abs(i) * 0.015)} strokeWidth={1} />,
    );
  }
  const rows: ReactNode[] = [];
  for (let i = 1; i <= 12; i++) {
    const y = n2(vy + Math.pow(i / 12, 2.2) * (H - vy));
    rows.push(<line key={i} x1={0} x2={W} y1={y} y2={y} stroke={O} strokeOpacity={n2(0.12 + (i / 12) * 0.3)} strokeWidth={1} />);
  }
  return (
    <Svg id="next">
      <defs>
        <linearGradient id="next-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#07090a" stopOpacity="0" />
          <stop offset="100%" stopColor={O} stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={vy} fill="url(#next-sky)" />
      <ellipse cx={vx} cy={vy} rx={320} ry={60} fill="url(#next-glow)" />
      {rays}
      <g className={p.flow}>{rows}</g>
      <line x1={0} x2={W} y1={vy} y2={vy} stroke="#ffd2a8" strokeOpacity={0.7} strokeWidth={1.2} />
      <circle cx={vx} cy={vy} r={5} fill="#fff1e2" filter="url(#next-bloom)" />
    </Svg>
  );
}

export const PATTERN: Record<Kind, () => React.JSX.Element> = {
  invite: Few,
  focus: Reason,
  early: Early,
  feedback: Feedback,
  team: Team,
  next: Next,
};
