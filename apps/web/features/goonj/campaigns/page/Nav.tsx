"use client";

import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "../../components/BrandLogo";
import n from "./nav.module.css";

const LINKS = [
  { id: "stories", label: "Stories" },
  { id: "points", label: "Why join early" },
  { id: "why", label: "Why Goonj" },
];

/**
 * The Goonj logo on its own at the left, and a compact floating glass pill
 * with the page's three chapters in the centre. A soft highlight slides to whichever chapter you're
 * reading. The pill firms up once you leave the top of the page, tucks away
 * while you scroll down and comes back the moment you scroll up.
 */
export function Nav() {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [tucked, setTucked] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const links = useRef<HTMLDivElement>(null);
  const [mark, setMark] = useState<{ x: number; w: number } | null>(null);

  // scrolled / tucked
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const read = () => {
      raf = 0;
      const y = window.scrollY;
      const d = y - last;
      last = y;
      setScrolled(y > 24);
      const focused = bar.current?.contains(document.activeElement);
      if (y < 240 || focused) setTucked(false);
      else if (d > 6) setTucked(true);
      else if (d < -6) setTucked(false);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // which chapter is on screen
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const hit = LINKS.find((l) => seen.get(l.id));
        setActive(hit ? hit.id : null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const l of LINKS) {
      const el = document.getElementById(l.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  // slide the highlight under the active link
  useEffect(() => {
    const wrap = links.current;
    const place = () => {
      const a = active && wrap?.querySelector<HTMLElement>(`a[data-id="${active}"]`);
      setMark(a ? { x: a.offsetLeft, w: a.offsetWidth } : null);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active]);

  return (
    <header
      ref={bar}
      className={n.nav}
      data-scrolled={scrolled ? "" : undefined}
      data-tucked={tucked ? "" : undefined}
    >
      <a href="https://goonj.com" className={n.brand} aria-label="Goonj home">
        <BrandLogo className={n.logo} priority />
      </a>
      <nav className={n.pill} aria-label="Page">
        <div ref={links} className={n.links}>
          <span
            className={n.mark}
            aria-hidden
            style={mark ? { transform: `translateX(${mark.x}px)`, width: mark.w, opacity: 1 } : undefined}
          />
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              data-id={l.id}
              className={n.link}
              aria-current={active === l.id ? "true" : undefined}
            >
              {l.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
