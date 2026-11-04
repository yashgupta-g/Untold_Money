import { useId, type CSSProperties } from "react";

import { cn } from "@/lib/utils";
import styles from "./traces.module.css";

export type Point = [number, number];

export type Trace = {
  id: string;
  /** Orthogonal route from the source (first point) to the target (last). */
  points: Point[];
};

/** Polyline with rounded corners (radius r), like a circuit trace. */
export function route(points: Point[], r = 14) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const k = Math.min(r, inLen / 2, outLen / 2);
    const ax = cx - ((cx - px) / inLen) * k;
    const ay = cy - ((cy - py) / inLen) * k;
    const bx = cx + ((nx - cx) / outLen) * k;
    const by = cy + ((ny - cy) / outLen) * k;
    d += ` L${ax} ${ay} Q${cx} ${cy} ${bx} ${by}`;
  }
  const [lx, ly] = points[points.length - 1];
  return `${d} L${lx} ${ly}`;
}

type TracesProps = {
  traces: Trace[];
  width: number;
  height: number;
  className?: string;
  /** Light on photography or dark sections (white lines), or ink on white. */
  tone?: "light" | "ink";
};

/**
 * Data-flow connectors: a hairline over a soft glow, a node at the source,
 * a pulsing ring at the target and a light packet travelling along the
 * route. Lines draw in once on load; packets and pulses stop under reduced
 * motion (traces.module.css).
 */
export function Traces({ traces, width, height, className, tone = "light" }: TracesProps) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      className={cn(styles.traces, tone === "ink" && styles.ink, className)}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <defs>
        <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <radialGradient id={`${uid}-packet`}>
          <stop offset="0" className={styles.packetCore} />
          <stop offset="1" className={styles.packetEdge} />
        </radialGradient>
      </defs>

      {traces.map((t, i) => {
        const d = route(t.points);
        const pathId = `${uid}-${t.id}`;
        const [sx, sy] = t.points[0];
        const [ex, ey] = t.points[t.points.length - 1];
        const delay = { "--i": i } as CSSProperties;
        return (
          <g key={t.id} className={styles.trace} style={delay}>
            <path className={styles.glow} d={d} filter={`url(#${uid}-glow)`} pathLength={1} />
            <path id={pathId} className={styles.line} d={d} pathLength={1} />
            <circle className={styles.source} cx={sx} cy={sy} r="4" />
            <circle className={styles.ripple} cx={ex} cy={ey} r="5" />
            <circle className={styles.target} cx={ex} cy={ey} r="4.5" />
            <circle className={styles.packet} r="7" fill={`url(#${uid}-packet)`}>
              <animateMotion
                dur="2.4s"
                begin={`${1.8 + i * 0.5}s`}
                repeatCount="indefinite"
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="spline"
                keySplines="0.45 0 0.35 1"
              >
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
