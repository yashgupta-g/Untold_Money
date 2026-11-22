"use client";

import { ArrowLeft, ArrowRight, Quotes } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { TESTIMONIALS } from "../static";
import w from "./stories.module.css";

const PEOPLE = TESTIMONIALS.people;
/** Grid areas of the nine photo tiles around the stage, in reading order. */
const SLOTS = ["a1", "t1", "t2", "d1", "a2", "d2", "b1", "b2", "d3"] as const;
/** Side columns drift against the scroll; the middle stays put. */
const DRIFT: Record<string, "a" | "d" | undefined> = { a1: "a", a2: "a", d1: "d", d2: "d", d3: "d" };

/**
 * A black, full-bleed photo bento: one person's story on the big centre
 * stage, everyone else around it. Picking a tile swaps that person onto the
 * stage (and the stage's person into the tile), so all ten stay on screen.
 * On phones the stage sits on top with a swipeable row of faces below.
 */
export function StoryWall() {
  // order[0] is on the stage, order[1..9] fill SLOTS.
  const [order, setOrder] = useState(() => PEOPLE.map((_, i) => i));
  const wall = useRef<HTMLDivElement>(null);
  const featured = PEOPLE[order[0]];

  const swap = (slot: number) =>
    setOrder((o) => {
      const n = [...o];
      [n[0], n[slot]] = [n[slot], n[0]];
      return n;
    });

  const step = (dir: 1 | -1) => {
    const target = (order[0] + dir + PEOPLE.length) % PEOPLE.length;
    swap(order.indexOf(target));
  };

  // Staggered entrance + quiet column drift on desktop.
  useEffect(() => {
    const el = wall.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) return;
    el.setAttribute("data-motion", "");

    const seen = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.setAttribute("data-in", "");
          seen.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    seen.observe(el);

    const desktop = window.matchMedia("(min-width: 1024px)");
    let raf = 0;
    const drift = () => {
      raf = 0;
      if (!desktop.matches) return;
      const r = el.getBoundingClientRect();
      // -1 as the wall enters from below, +1 as it leaves at the top.
      const p = Math.max(-1, Math.min(1, 1 - (2 * (r.top + r.height)) / (window.innerHeight + r.height)));
      el.style.setProperty("--sa", `${(p * 56).toFixed(1)}px`);
      el.style.setProperty("--sd", `${(p * -72).toFixed(1)}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(drift);
    };
    drift();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      seen.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={wall} className={w.wall}>
      <figure className={w.stage} aria-live="polite">
        <div key={featured.name} className={w.stageInner}>
          <div className={w.ambient} aria-hidden>
            <Image src={featured.photo} alt="" fill sizes="40vw" />
          </div>
          <div className={w.stagePhoto}>
            <Image src={featured.photo} alt={featured.name} fill sizes="(min-width: 1024px) 40vw, 100vw" />
          </div>
          <div className={w.stageText}>
            <Quotes className={w.mark} weight="fill" aria-hidden />
            <blockquote className={w.quote}>{featured.quote}</blockquote>
            <figcaption className={w.who}>
              <span className={w.name}>{featured.name}</span>
              <span className={w.role}>{featured.role}</span>
            </figcaption>
          </div>
        </div>
        <div className={w.controls}>
          <span className={w.count}>
            {String(order[0] + 1).padStart(2, "0")}
            <span> / {String(PEOPLE.length).padStart(2, "0")}</span>
          </span>
          <button type="button" className={w.arrow} onClick={() => step(-1)} aria-label="Previous story">
            <ArrowLeft />
          </button>
          <button type="button" className={w.arrow} onClick={() => step(1)} aria-label="Next story">
            <ArrowRight />
          </button>
        </div>
      </figure>

      <div className={w.tiles}>
        {SLOTS.map((area, i) => {
          const p = PEOPLE[order[i + 1]];
          return (
            <button
              key={area}
              type="button"
              className={w.tile}
              data-area={area}
              data-drift={DRIFT[area]}
              style={{ gridArea: area, ["--i" as string]: i }}
              onClick={() => swap(i + 1)}
              aria-label={`Read ${p.name}'s story`}
            >
              <span key={p.name} className={w.tilePhoto}>
                <Image src={p.photo} alt="" fill sizes="(min-width: 1024px) 32vw, 140px" />
              </span>
              <span className={w.tileLabel}>
                <span className={w.tileName}>{p.name}</span>
                <span className={w.tileRole}>{p.role}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
