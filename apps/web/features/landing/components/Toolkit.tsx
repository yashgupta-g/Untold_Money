import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Brain, WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";
import { MEDIA, TOOLS, type Tool } from "../content";
import shared from "../landing.module.css";
import { IsoBox, type IsoView } from "./iso";
import styles from "./toolkit.module.css";

const tool = (id: string) => TOOLS.find((t) => t.id === id) as Tool;

/*
 * Market data as an isometric bar field: one column per session, rising
 * toward the front corner, the last one lit.
 */
const BARS_VIEW: IsoView = { s: 22, ox: 200, oy: 70 };
const BARS = Array.from({ length: 4 }, (_, row) =>
  Array.from({ length: 6 }, (_, col) => {
    const t = (row * 6 + col) / 23;
    const h = 0.8 + t * 3.2 + Math.sin(row * 2.1 + col * 1.3) * 0.6;
    return { x: col * 1.25, y: row * 1.25, h: Math.max(0.5, h), last: row === 3 && col === 5 };
  }),
).flat();

/** Stacked contour "mountain": layered ridgelines in cobalt tints. */
const WAVES = Array.from({ length: 7 }, (_, k) => {
  const base = 70 + k * 26;
  const amp = 46 - k * 4;
  let d = `M0 ${base}`;
  for (let x = 0; x <= 400; x += 10) {
    const y =
      base -
      amp * Math.exp(-(((x - 230 + k * 6) / 95) ** 2)) -
      (amp / 3) * Math.exp(-(((x - 90 - k * 4) / 60) ** 2)) +
      4 * Math.sin(x / 23 + k);
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return `${d} L400 300 L0 300 Z`;
});

export function Toolkit() {
  return (
    <section id="tools" className={shared.section}>
      <div className={shared.container}>
        <div className={styles.head}>
          <div className={shared.sectionHead} data-reveal>
            <span className={shared.eyebrow}>Live today</span>
            <h2 className={shared.h2}>What you can use today</h2>
          </div>
          <p className={shared.lede} data-reveal>
            Each one does a single job and shows how it got its answer. They share the same stocks,
            holdings and trades, so the analysis follows your money.
          </p>
        </div>

        <div className={styles.grid}>
          {/* Stock Analyzer: hand-held phone photo */}
          <Card className={cn(styles.span7, styles.tall, styles.photoLight)} t={tool("analysis")}>
            <Image
              className={styles.cover}
              src={MEDIA.handAnalyze.src}
              alt="A hand holding a phone showing the UntoldMoney stock screen for RELIANCE"
              fill
              sizes="(max-width: 900px) 100vw, 58vw"
            />
          </Card>

          {/* Portfolio X-ray: scenery with a floating card */}
          <Card className={cn(styles.span5, styles.tall, styles.photoDark)} t={tool("allocation")}>
            <Image
              className={styles.cover}
              src={MEDIA.ridge.src}
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 42vw"
            />
            <div className={styles.float} aria-hidden="true">
              <span className={styles.floatLabel}>Long-term portfolio</span>
              <span className={cn(styles.floatValue, shared.num)}>₹12,45,680</span>
              <span className={styles.floatRow}>
                <span className={cn(styles.gain, shared.num)}>+₹1,08,240 · 9.5%</span>
                <span className={styles.floatMuted}>unrealized</span>
              </span>
              <span className={styles.alloc}>
                {[34, 22, 17, 15, 12].map((w, i) => (
                  <i key={i} style={{ flexGrow: w }} />
                ))}
              </span>
              <span className={styles.warn}>
                <WarningCircle size={15} weight="fill" />
                HDFCBANK is 34.2% of value, above your 30% limit
              </span>
            </div>
          </Card>

          {/* Market data: isometric bar field */}
          <Card className={styles.span4} t={tool("market")}>
            <div className={styles.bars} aria-hidden="true">
              <svg viewBox="0 0 400 300">
                {BARS.map((b, i) => (
                  <IsoBox
                    key={i}
                    view={BARS_VIEW}
                    box={{ x: b.x, y: b.y, w: 0.9, d: 0.9, h: b.h }}
                    faceClass={
                      b.last
                        ? {
                            top: styles.barHotTop,
                            left: styles.barHotLeft,
                            right: styles.barHotRight,
                          }
                        : { top: styles.barTop, left: styles.barLeft, right: styles.barRight }
                    }
                    style={{ "--i": i } as CSSProperties}
                  />
                ))}
              </svg>
              <span className={styles.dataChip}>
                RELIANCE <b className={shared.num}>₹2,948.60</b>
                <span className={shared.num}>+1.24%</span>
              </span>
            </div>
          </Card>

          {/* ML Direction: contour illustration */}
          <Card className={styles.span4} t={tool("ml")}>
            <div className={styles.waves} aria-hidden="true">
              <svg viewBox="0 0 400 300" preserveAspectRatio="none">
                {WAVES.map((d, i) => (
                  <path key={i} d={d} className={styles[`wave${i}` as "wave0"]} />
                ))}
              </svg>
              <span className={styles.dirChip}>
                <span className={styles.dirIcon}>
                  <Brain size={13} weight="bold" />
                </span>
                Your 3-day setup
                <span className={shared.num}>57% accurate on unseen data</span>
              </span>
            </div>
          </Card>

          {/* Trade Journal: tablet photo */}
          <Card className={cn(styles.span4)} t={tool("journal")}>
            <div className={styles.media}>
              <Image
                className={styles.cover}
                src={MEDIA.handTablet.src}
                alt="Hands holding a tablet showing the UntoldMoney journal performance dashboard"
                fill
                sizes="(max-width: 900px) 100vw, 33vw"
              />
            </div>
          </Card>

          {/* Alerts: wide card with the hand-held lock screen */}
          <article className={cn(styles.card, styles.span12, styles.wide)} data-reveal>
            <div className={styles.wideCopy}>
              <h3 className={shared.h3}>{tool("alerts").name}</h3>
              <p>{tool("alerts").body}</p>
              <span className={styles.meta}>{tool("alerts").meta}</span>
              <Link className={cn(shared.btn, shared.btnPrimary, styles.wideCta)} href="/register">
                Start free
                <span className={shared.btnArrow}>
                  <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
                </span>
              </Link>
            </div>
            <div className={styles.wideMedia}>
              <Image
                className={styles.cover}
                src={MEDIA.handAlerts.src}
                alt="A hand holding a phone whose lock screen shows UntoldMoney price and RSI alerts"
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
              />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Card({ t, className, children }: { t: Tool; className?: string; children: ReactNode }) {
  return (
    <article className={cn(styles.card, className)} data-reveal>
      <div className={styles.copy}>
        <h3 className={shared.h3}>{t.name}</h3>
        <p>{t.body}</p>
        <span className={styles.meta}>{t.meta}</span>
      </div>
      {children}
    </article>
  );
}
