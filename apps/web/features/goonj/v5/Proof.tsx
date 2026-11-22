"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import { STORIES } from "../content";
import u from "../v4/ui.module.css";
import p from "./proof.module.css";

/* Early members, as a dark carousel: a photo, then their words. SAMPLE quotes until real ones arrive. */
const PHOTOS: Record<string, { src: string; pos: string }> = {
  "Ananya R.": { src: "/goonj/presenting.jpg", pos: "78% 28%" },
  "Vikram S.": { src: "/goonj/desk-laptop.jpg", pos: "56% 35%" },
  "Mehak K.": { src: "/goonj/aarya-call.jpg", pos: "62% 28%" },
  "Arjun M.": { src: "/goonj/portrait-arjun.jpg", pos: "50% 25%" },
  "Farah N.": { src: "/goonj/portrait-meera.jpg", pos: "50% 22%" },
  "Karan T.": { src: "/goonj/colleagues.jpg", pos: "32% 30%" },
};

function Arrow({ dir }: { dir: "l" | "r" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d={dir === "l" ? "M16 10H4m5-5-5 5 5 5" : "M4 10h12m-5-5 5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Proof() {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1;
    setAt(Math.round(el.scrollLeft / (w + 20)));
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const go = (d: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth;
    el.scrollBy({ left: d * (w + 20), behavior: "smooth" });
  };

  return (
    <section id="stories" className={p.wrap} aria-labelledby="proof-title">
      <span className={p.grain} aria-hidden="true" />
      <div className={u.container}>
        <div className={p.head}>
          <div>
            <span className={p.eyebrow}>
              <span className={p.bars} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              Early members · sample stories
            </span>
            <h2 id="proof-title" className={p.title}>
              Practised with Goonj.
              <br />
              <span>Handled it at work.</span>
            </h2>
          </div>
          <div className={p.nav}>
            <button type="button" onClick={() => go(-1)} disabled={edges.start} aria-label="Previous story">
              <Arrow dir="l" />
            </button>
            <button type="button" onClick={() => go(1)} disabled={edges.end} aria-label="Next story">
              <Arrow dir="r" />
            </button>
          </div>
        </div>
      </div>

      <div ref={track} className={p.track} tabIndex={0} aria-label="Stories">
        {STORIES.map((s, i) => {
          const ph = PHOTOS[s.name] ?? { src: "/goonj/portrait-meera.jpg", pos: "50% 25%" };
          return (
            <figure key={s.name} className={p.card} data-on={i === at || undefined}>
              <span className={p.photo}>
                <Image src={ph.src} alt="" fill sizes="(max-width: 760px) 90vw, 420px" style={{ objectFit: "cover", objectPosition: ph.pos }} />
              </span>
              <div className={p.body}>
                <span className={p.mark} aria-hidden="true">
                  “
                </span>
                <blockquote className={p.quote}>{s.quote}</blockquote>
                <p className={p.shift}>
                  <span>Before</span>
                  {s.before}
                  <span>Now</span>
                  {s.after}
                </p>
                <figcaption className={p.who}>
                  <b>{s.name}</b>
                  {s.role} · {s.city}
                </figcaption>
              </div>
            </figure>
          );
        })}
      </div>

      <div className={u.container}>
        <div className={p.dots} aria-hidden="true">
          {STORIES.map((s, i) => (
            <i key={s.name} data-on={i === at || undefined} />
          ))}
        </div>
      </div>
    </section>
  );
}
