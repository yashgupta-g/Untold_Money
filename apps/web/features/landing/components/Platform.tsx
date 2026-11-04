"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  BellRinging,
  Brain,
  ChartLineUp,
  ChartPieSlice,
  ChatsCircle,
  ClockCounterClockwise,
  Notebook,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { PLATFORM, POSITIONING, type PlatformModule } from "../content";
import shared from "../landing.module.css";
import { IsoBox, IsoTop, isoPath, labelAt, type Box, type IsoView } from "./iso";
import styles from "./platform.module.css";

type Id = PlatformModule["id"];

export const MODULE_ICONS: Record<Id, Icon> = {
  analysis: Brain,
  market: ChartLineUp,
  allocation: ChartPieSlice,
  journal: Notebook,
  alerts: BellRinging,
  trading: Wallet,
  analyst: ChatsCircle,
  backtest: ClockCounterClockwise,
};

/*
 * The map: a 12×12 slab with the AI core in the middle and one 2×2 block per
 * module around it. Pipeline modules sit at the back as dashed outlines.
 */
const W = 1000;
const H = 780;
const VIEW: IsoView = { s: 46, ox: 498, oy: 182 };
const SLAB: Box = { x: 0, y: 0, z: -0.5, w: 12, d: 12, h: 0.5 };
const CORE: Box = { x: 5, y: 5, w: 2, d: 2, h: 2.2 };
const PLACE: Record<Id, { x: number; y: number; h: number }> = {
  backtest: { x: 1, y: 1, h: 1 },
  trading: { x: 5, y: 1, h: 1 },
  analyst: { x: 1, y: 5, h: 1 },
  alerts: { x: 9, y: 1, h: 1.1 },
  market: { x: 9, y: 5, h: 1.3 },
  journal: { x: 1, y: 9, h: 1.1 },
  allocation: { x: 5, y: 9, h: 1.3 },
  analysis: { x: 9, y: 9, h: 1.6 },
};
const boxOf = (id: Id): Box => ({ ...PLACE[id], w: 2, d: 2 });
/** Everything drawn on the slab, back to front, so nearer blocks cover farther ones. */
const DRAW = [
  ...PLATFORM.map((m) => ({ m, depth: PLACE[m.id].x + PLACE[m.id].y })),
  { m: null, depth: CORE.x + CORE.y },
].sort((a, b) => a.depth - b.depth);
const GRID = Array.from({ length: 13 }, (_, i) => i);

const LIVE = PLATFORM.filter((m) => m.status === "live");
const SOON = PLATFORM.filter((m) => m.status === "soon");

const vars = (v: Record<string, string | number>) => v as CSSProperties;

export function Platform() {
  const rootRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Id | null>(null);
  const [shown, setShown] = useState(false);

  // The blocks rise into place the first time the map is on screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      { threshold: 0.15 },
    );
    io.observe(mapRef.current ?? root);
    return () => io.disconnect();
  }, []);

  const face = (tone: "slab" | "core" | "live" | "soon") => ({
    top: styles[`${tone}Top` as "liveTop"],
    left: styles[`${tone}Left` as "liveLeft"],
    right: styles[`${tone}Right` as "liveRight"],
  });

  return (
    <section
      ref={rootRef}
      id="platform"
      className={shared.section}
      aria-labelledby="platform-title"
      data-shown={shown || undefined}
    >
      <div className={shared.container}>
        <div className={cn(shared.sectionHead, shared.sectionHeadCenter)} data-reveal>
          <span className={shared.eyebrow}>{POSITIONING.eyebrow}</span>
          <h2 id="platform-title" className={shared.h2}>
            One workspace for your whole financial life
          </h2>
          <p className={shared.lede}>
            Five tools are live today, built around one AI core. New ones plug into the same
            foundation, so everything you add works with what you already use.
          </p>
        </div>

        <div className={styles.layout}>
          <div ref={mapRef} className={styles.map} aria-hidden="true">
            <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg}>
              <defs>
                <radialGradient id="pf-glow">
                  <stop offset="0" className={styles.glowStopA} />
                  <stop offset="1" className={styles.glowStopB} />
                </radialGradient>
              </defs>

              {/* Base slab with a drawing grid on top. */}
              <IsoBox view={VIEW} box={SLAB} faceClass={face("slab")} />
              <g className={styles.grid}>
                {GRID.map((i) => (
                  <g key={i}>
                    <path
                      d={isoPath(VIEW, [
                        [i, 0, 0],
                        [i, 12, 0],
                      ])}
                    />
                    <path
                      d={isoPath(VIEW, [
                        [0, i, 0],
                        [12, i, 0],
                      ])}
                    />
                  </g>
                ))}
              </g>
              <ellipse cx={500} cy={VIEW.oy + 6 * 46} rx={260} ry={150} fill="url(#pf-glow)" />

              {/* Data lines from the core out to every module. */}
              {PLATFORM.map((m, i) => {
                const p = PLACE[m.id];
                const d = isoPath(VIEW, [
                  [6, 6, 0],
                  [p.x + 1, p.y + 1, 0],
                ]);
                return (
                  <g
                    key={m.id}
                    className={cn(styles.link, m.status === "soon" && styles.linkSoon)}
                    data-on={active === m.id || undefined}
                  >
                    <path id={`pf-link-${m.id}`} d={d} />
                    {m.status === "live" && (
                      <circle r="4" className={styles.packet}>
                        <animateMotion dur="2.4s" begin={`${i * 0.35}s`} repeatCount="indefinite">
                          <mpath href={`#pf-link-${m.id}`} />
                        </animateMotion>
                      </circle>
                    )}
                  </g>
                );
              })}

              {/* Modules and the core, back to front. */}
              {DRAW.map(({ m }, i) => {
                if (!m) return <Core key="core" />;
                const box = boxOf(m.id);
                const ModIcon = MODULE_ICONS[m.id];
                return (
                  <g
                    key={m.id}
                    className={styles.block}
                    data-status={m.status}
                    data-on={active === m.id || undefined}
                    style={vars({ "--i": i })}
                  >
                    <IsoBox
                      view={VIEW}
                      box={box}
                      faceClass={face(m.status === "live" ? "live" : "soon")}
                    />
                    <IsoTop view={VIEW} box={box} inset={0.45}>
                      <ModIcon size={24} weight="duotone" className={styles.topIcon} />
                    </IsoTop>
                  </g>
                );
              })}
            </svg>

            {/* Labels pinned above each block. */}
            {PLATFORM.map((m) => {
              const ModIcon = MODULE_ICONS[m.id];
              return (
                <span
                  key={m.id}
                  className={styles.tag}
                  data-status={m.status}
                  data-on={active === m.id || undefined}
                  style={labelAt(VIEW, boxOf(m.id), W, H)}
                >
                  <ModIcon size={14} weight="bold" />
                  {m.name}
                  {m.status === "soon" && <em>Soon</em>}
                </span>
              );
            })}
            <span className={cn(styles.tag, styles.coreTag)} style={labelAt(VIEW, CORE, W, H)}>
              AI core
            </span>
          </div>

          <div className={styles.legend}>
            {SOON.length > 0 ? (
              <>
                <ModuleList title="Live today" items={LIVE} active={active} onHover={setActive} />
                <ModuleList title="In the pipeline" items={SOON} active={active} onHover={setActive} />
              </>
            ) : (
              <>
                <ModuleList title="Analyse and track" items={LIVE.slice(0, 4)} active={active} onHover={setActive} />
                <ModuleList title="Act and test" items={LIVE.slice(4)} active={active} onHover={setActive} />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Core() {
  return (
    <g className={styles.core}>
      <IsoBox
        view={VIEW}
        box={CORE}
        faceClass={{ top: styles.coreTop, left: styles.coreLeft, right: styles.coreRight }}
      />
      <IsoTop view={VIEW} box={CORE} inset={0.5}>
        <svg width="24" height="24" viewBox="0 0 26 26">
          <path d="M2 10 10 2h6L2 16zM24 16l-8 8h-6l14-14z" className={styles.coreMark} />
        </svg>
      </IsoTop>
    </g>
  );
}

function ModuleList({
  title,
  items,
  active,
  onHover,
}: {
  title: string;
  items: PlatformModule[];
  active: Id | null;
  onHover: (id: Id | null) => void;
}) {
  return (
    <div className={styles.group} data-reveal>
      <h3 className={styles.groupTitle}>
        <i data-status={items[0]?.status} aria-hidden="true" />
        {title}
      </h3>
      <ul className={styles.list}>
        {items.map((m) => {
          const ModIcon = MODULE_ICONS[m.id];
          return (
            <li
              key={m.id}
              className={styles.item}
              data-status={m.status}
              data-on={active === m.id || undefined}
              onPointerEnter={() => onHover(m.id)}
              onPointerLeave={() => onHover(null)}
            >
              <span className={styles.itemIcon} aria-hidden="true">
                <ModIcon size={18} weight="duotone" />
              </span>
              <span className={styles.itemText}>
                <b>{m.name}</b>
                <small>{m.body}</small>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
