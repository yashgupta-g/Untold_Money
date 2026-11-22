"use client";

import { Pause, Play } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import type { Kind } from "./graphics";
import { PATTERN } from "./patterns";
import r from "./reel.module.css";

type Item = { title: string; body: string; kind: Kind };

/** px per second; negative = the row moves right to left. */
const BASE = -60;

/**
 * "Why join early" as a slow, endless row of wallpaper cards that always
 * drifts right to left at a steady speed, whatever the page scroll does. A
 * drag flings it (then it eases back to its pace), and each wallpaper shifts
 * a little inside its frame as it travels. Reduced motion gets a plain
 * swipeable row instead.
 */
export function Reel({ items }: { items: Item[] }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [live, setLive] = useState(false);

  // At least six cards per set, so one set is always wider than the screen.
  const reps = Math.max(1, Math.ceil(6 / items.length));
  const set = Array.from({ length: reps }, () => items).flat();

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const el = root.current;
    const tr = track.current;
    if (!el || !tr) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Set now (not only via state) so the duplicate set is laid out before measuring.
    el.setAttribute("data-live", "");
    setLive(true);

    const cards = Array.from(tr.children) as HTMLElement[];
    const bgs = cards.map((c) => c.querySelector<HTMLElement>("[data-bg]"));
    let lefts: number[] = [];
    let widths: number[] = [];
    let setW = 0;
    let vw = window.innerWidth;
    let x = 0;
    let placed = false;

    const measure = () => {
      lefts = cards.map((c) => c.offsetLeft);
      widths = cards.map((c) => c.offsetWidth);
      const half = cards.length / 2;
      setW = lefts[half] - lefts[0];
      vw = window.innerWidth;
      if (!placed && setW > 0) {
        x = -setW;
        placed = true;
      }
    };

    let speed = BASE;
    let raf = 0;
    let last = 0;

    // drag
    let down = false;
    let dragging = false;
    let startX = 0;
    let prevX = 0;
    let prevT = 0;
    let dragV = 0;

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0);
      last = t;
      if (!dragging) {
        const want = pausedRef.current ? 0 : BASE;
        speed += (want - speed) * Math.min(1, dt * 2.2);
        x += speed * dt;
      }
      if (setW > 0) {
        while (x >= 0) x -= setW;
        while (x < -setW) x += setW;
      }
      tr.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      for (let i = 0; i < cards.length; i++) {
        const bg = bgs[i];
        if (!bg) continue;
        const centre = x + lefts[i] + widths[i] / 2;
        const rel = Math.max(-1, Math.min(1, (centre - vw / 2) / vw));
        bg.style.transform = `translate3d(${(rel * -6).toFixed(2)}%,0,0) scale(1.16)`;
      }
    };

    const start = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
      el.removeAttribute("data-idle");
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      el.setAttribute("data-idle", "");
    };

    const seen = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "120px 0px" });
    const ro = new ResizeObserver(measure);
    measure();
    ro.observe(tr);
    seen.observe(el);

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      down = true;
      dragging = false;
      startX = prevX = e.clientX;
      prevT = performance.now();
      dragV = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      if (!dragging) {
        if (Math.abs(e.clientX - startX) < 6) return;
        dragging = true;
        el.setAttribute("data-drag", "");
        el.setPointerCapture(e.pointerId);
      }
      const now = performance.now();
      const dx = e.clientX - prevX;
      x += dx;
      dragV = dragV * 0.6 + (dx / Math.max(1, now - prevT)) * 1000 * 0.4;
      prevX = e.clientX;
      prevT = now;
    };
    const onUp = () => {
      if (dragging) {
        speed = Math.max(-2400, Math.min(2400, dragV));
      }
      down = dragging = false;
      el.removeAttribute("data-drag");
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      stop();
      seen.disconnect();
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [items.length]);

  const card = (it: Item, i: number, dup: boolean) => {
    const Art = PATTERN[it.kind];
    return (
      <article
        key={`${dup ? "b" : "a"}${i}`}
        className={r.card}
        data-dup={dup || i >= items.length ? "" : undefined}
        aria-hidden={dup || i >= items.length ? true : undefined}
      >
        <div className={r.bg} data-bg>
          <Art />
        </div>
        <div className={r.text}>
          <h3 className={r.title}>{it.title}</h3>
          {it.body ? <p className={r.body}>{it.body}</p> : null}
        </div>
      </article>
    );
  };

  return (
    <div ref={root} className={r.reel} data-live={live ? "" : undefined}>
      <div ref={track} className={r.track}>
        {set.map((it, i) => card(it, i, false))}
        {set.map((it, i) => card(it, i, true))}
      </div>
      {live ? (
        <button
          type="button"
          className={r.toggle}
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? "Play the cards" : "Pause the cards"}
        >
          {paused ? <Play weight="fill" /> : <Pause weight="fill" />}
        </button>
      ) : null}
    </div>
  );
}
