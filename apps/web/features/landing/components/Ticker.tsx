import { cn } from "@/lib/utils";
import { TICKER_ROWS, type TickerItem } from "../content";
import shared from "../landing.module.css";
import styles from "./ticker.module.css";

const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A small seeded price walk per symbol that drifts the way the day moved. */
function spark(symbol: string, change: number) {
  let seed = [...symbol].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7);
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pts: number[] = [];
  let v = 0;
  for (let i = 0; i < 16; i++) {
    v += rand() - 0.5 + (change / 4) * (i / 16);
    pts.push(v);
  }
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  return pts
    .map((p, i) => {
      const y = 22 - ((p - lo) / (hi - lo || 1)) * 20;
      return `${i ? "L" : "M"}${((i * 56) / 15).toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Market data carousel under the hero: two rows drifting in opposite
 * directions, the same pattern as the logo carousel. CSS-only; pauses on hover.
 */
export function Ticker() {
  return (
    <section className={styles.ticker} aria-labelledby="ticker-caption">
      <p id="ticker-caption" className={styles.caption}>
        Sample market data, NSE large caps
      </p>
      <div className={styles.rows}>
        {TICKER_ROWS.map((row, i) => (
          <Row key={i} items={row} reverse={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

function Row({ items, reverse }: { items: TickerItem[]; reverse?: boolean }) {
  // Two copies: one copy of 12 tiles is wider than any screen, so scrolling by
  // half the track loops seamlessly. The copy is hidden from assistive tech.
  return (
    <div className={styles.viewport}>
      <ul className={cn(styles.track, reverse && styles.reverse)}>
        {[0, 1].map((copy) =>
          items.map((item) => (
            <li
              key={`${copy}-${item.symbol}`}
              className={styles.tile}
              aria-hidden={copy > 0 || undefined}
            >
              <span className={styles.badge} aria-hidden="true">
                {item.symbol.slice(0, 2)}
              </span>
              <span className={styles.info}>
                <b>{item.symbol}</b>
                <small>{item.name}</small>
              </span>
              <svg className={styles.spark} viewBox="0 0 56 24" aria-hidden="true">
                <path
                  d={spark(item.symbol, item.change)}
                  data-down={item.change < 0 || undefined}
                />
              </svg>
              <span className={styles.price}>
                <b className={shared.num}>₹{inr.format(item.price)}</b>
                <span
                  className={cn(
                    styles.change,
                    shared.num,
                    item.change < 0 ? styles.loss : styles.gain,
                  )}
                >
                  {item.change > 0 ? "+" : "−"}
                  {Math.abs(item.change).toFixed(2)}%
                </span>
              </span>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
