import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";
import { MCP_CLIENTS, STACK, type BrandIcon } from "../brandIcons";
import shared from "../landing.module.css";
import styles from "./integrations.module.css";

const ALL = [...MCP_CLIENTS, ...STACK];

/**
 * Dark logo carousel: two rows drifting in opposite directions, every mark
 * drawn in the cobalt accent. Each path is defined once in a sprite and the
 * looping rows only reference it.
 */
export function Integrations() {
  return (
    <section className={shared.darkSection} aria-labelledby="integrations-title">
      <div className={cn(shared.darkPanel, styles.panel)}>
        <svg className={styles.sprite} aria-hidden="true">
          <defs>
            <linearGradient id="brand-ink" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" className={styles.inkTop} />
              <stop offset="1" className={styles.inkBottom} />
            </linearGradient>
            {ALL.map((icon) => (
              <symbol key={icon.slug} id={`brand-${icon.slug}`} viewBox="0 0 24 24">
                <path d={icon.path} />
              </symbol>
            ))}
          </defs>
        </svg>

        <div className={shared.container}>
          <div
            className={cn(shared.sectionHead, shared.sectionHeadCenter, styles.head)}
            data-reveal
          >
            <h2 id="integrations-title" className={cn(shared.h2, styles.title)}>
              <span>Plug your AI assistant into</span>
              <span>live NSE and US market data</span>
            </h2>
            <p className={shared.lede}>
              UntoldMoney speaks the Model Context Protocol, so Claude, Cursor and other assistants
              can pull candles, indicators and validated predictions. Prices come from Yahoo
              Finance; the models run on scikit-learn.
            </p>
          </div>
        </div>

        {/* The brand coin drops into the middle of the drifting rows. */}
        <div className={styles.universe}>
          <div className={styles.rows}>
            <Row label="AI assistants that connect over MCP" icons={MCP_CLIENTS} />
            <Row label="Built with" icons={STACK} reverse />
          </div>
          <Coin />
        </div>

        <div className={styles.cta} data-reveal>
          <Link className={cn(shared.btn, styles.button)} href="/register">
            Get started free
            <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Stacked discs give the CSS 3D coin its thickness. */
const COIN_LAYERS = 14;

function Coin() {
  return (
    <div className={styles.coinWrap} aria-hidden="true">
      <span className={styles.coinGlow} data-coin-glow />
      <div className={styles.coinDrop} data-coin>
        <div className={styles.coin}>
          {Array.from({ length: COIN_LAYERS }, (_, i) => (
            <span key={i} className={styles.coinEdge} style={{ "--z": i } as CSSProperties} />
          ))}
          <span className={cn(styles.coinFace, styles.coinBack)} />
          <span className={styles.coinFace}>
            <svg viewBox="0 0 26 26">
              <path d="M2 10 10 2h6L2 16zM24 16l-8 8h-6l14-14z" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, icons, reverse }: { label: string; icons: BrandIcon[]; reverse?: boolean }) {
  // Six copies: the track scrolls by half its length, and that half must be
  // wider than the widest screen for the loop to stay seamless. Only the first
  // copy is exposed to assistive tech.
  const copies = [0, 1, 2, 3, 4, 5];
  const tiles = (copy: number) =>
    icons.map((icon) => (
      <li key={`${copy}-${icon.slug}`} className={styles.tile} aria-hidden={copy > 0 || undefined}>
        <svg className={styles.mark} aria-hidden="true">
          <use href={`#brand-${icon.slug}`} />
        </svg>
        <span className={styles.name}>{icon.title}</span>
      </li>
    ));

  return (
    <div className={styles.viewport}>
      <ul className={cn(styles.track, reverse && styles.reverse)} aria-label={label}>
        {copies.map(tiles)}
      </ul>
    </div>
  );
}
