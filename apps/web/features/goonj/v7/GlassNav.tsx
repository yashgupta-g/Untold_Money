"use client";

import { useEffect, useRef, useSyncExternalStore, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "@phosphor-icons/react";

import { BrandLogo } from "../components/BrandLogo";
import { VersionSwitch } from "../components/VersionSwitch";
import { GOONJ } from "../content";
import { GlossLink } from "./GlossLink";
import g from "./glassNav.module.css";

const LINKS = [
  ["Home", "#top"],
  ["How it works", "#how"],
  ["Mentors", "#mentors"],
  ["Plans", "#plans"],
  ["Stories", "#stories"],
  ["FAQ", "#faq"],
] as const;

/* ---------- what's under the glass: light or dark? ---------- */

const COLOR = /rgba?\(([^)]+)\)/g;

/** Average lightness (0-1) of the opaque-enough colours in a CSS colour/gradient string, or null. */
function lightness(css: string) {
  let sum = 0;
  let weight = 0;
  for (const [, body] of css.matchAll(COLOR)) {
    const [r, g2, b, a = "1"] = body.split(/[\s,/]+/).filter(Boolean);
    const alpha = parseFloat(a);
    if (alpha < 0.3) continue;
    sum += ((0.2126 * +r + 0.7152 * +g2 + 0.0722 * +b) / 255) * alpha;
    weight += alpha;
  }
  return weight ? sum / weight : null;
}

let navEl: HTMLElement | null = null;

/** The first painted surface under (x, y) beneath the nav, read top-down. */
function surfaceAt(x: number, y: number) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (navEl?.contains(el)) continue;
    const cs = getComputedStyle(el);
    const fromColor = lightness(cs.backgroundColor);
    if (fromColor !== null) return fromColor;
    if (cs.backgroundImage.includes("gradient")) {
      const fromGradient = lightness(cs.backgroundImage);
      if (fromGradient !== null) return fromGradient;
    }
  }
  return 1; // the page itself is light
}

/* scroll state as one snapshot string: "<scrolled>|<over the hero>|<dark below>" */
function subscribeScroll(cb: () => void) {
  let raf = 0;
  const on = () => {
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0;
        cb();
      });
  };
  window.addEventListener("scroll", on, { passive: true });
  window.addEventListener("resize", on);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("scroll", on);
    window.removeEventListener("resize", on);
  };
}

function scrollSnapshot() {
  const hero = document.getElementById("top");
  const over = !!hero && hero.getBoundingClientRect().bottom > 72;
  let dark = false;
  if (!over && navEl) {
    // three samples across the bar, behind its middle; most of them decide
    const r = navEl.getBoundingClientRect();
    const y = r.top + r.height / 2;
    const hits = [0.2, 0.5, 0.8].map((f) => surfaceAt(r.left + r.width * f, y) < 0.5);
    dark = hits.filter(Boolean).length >= 2;
  }
  return `${window.scrollY > 24 ? 1 : 0}|${over ? 1 : 0}|${dark ? 1 : 0}`;
}

/* Chromium can bend the page behind the bar through an SVG filter (real
   refraction); everywhere else keeps the frosted glass. */
const noop = () => () => {};
function canRefract() {
  return "userAgentData" in navigator && CSS.supports("backdrop-filter", "url(#x) blur(1px)");
}
const mounted = () => true;
const notMounted = () => false;

/*
 * The lens: a displacement map that is neutral (mid-grey) across the middle
 * and ramps at the edges, so the page bends only at the rim, like a thick
 * glass pill. Red drives x, green drives y.
 */
const LENS = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='64' preserveAspectRatio='none'>" +
    "<defs>" +
    "<linearGradient id='h'><stop offset='0' stop-color='#ff0000'/><stop offset='.1' stop-color='#800000'/><stop offset='.9' stop-color='#800000'/><stop offset='1' stop-color='#000000'/></linearGradient>" +
    "<linearGradient id='v' x2='0' y2='1'><stop offset='0' stop-color='#00ff00'/><stop offset='.34' stop-color='#008000'/><stop offset='.66' stop-color='#008000'/><stop offset='1' stop-color='#000000'/></linearGradient>" +
    "</defs>" +
    "<rect width='400' height='64' fill='url(#h)'/>" +
    "<rect width='400' height='64' fill='url(#v)' style='mix-blend-mode:screen'/>" +
    "</svg>",
)}`;

/**
 * The liquid-glass nav: one fixed bar for the whole page, mounted on <body>
 * so no section can paint over it. It reads what is underneath and turns
 * smoky with light text over dark surfaces, clear with ink over light ones.
 * Edge refraction (Chromium), a specular rim, a gleam that glides as you
 * scroll, a pointer glow and a glass pill that slides to the hovered link.
 */
export function GlassNav({ tone = "light" }: { tone?: "light" | "dark" }) {
  const isMounted = useSyncExternalStore(noop, mounted, notMounted);
  const state = useSyncExternalStore(subscribeScroll, scrollSnapshot, () => "0|1|0");
  const refract = useSyncExternalStore(noop, canRefract, () => false);
  const [scrolled, overHero, darkBelow] = state.split("|").map((v) => v === "1");
  const dark = overHero ? tone === "dark" : darkBelow;

  const bar = useRef<HTMLDivElement>(null);
  const links = useRef<HTMLElement>(null);

  // the gleam travels with the scroll, like light sliding over curved glass
  useEffect(() => {
    let raf = 0;
    const on = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        bar.current?.style.setProperty("--shine", `${((window.scrollY * 0.05) % 100).toFixed(2)}%`);
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
    };
  }, [isMounted]);

  const glow = (e: PointerEvent<HTMLDivElement>) => {
    const el = bar.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const slide = (e: PointerEvent<HTMLElement>) => {
    const a = (e.target as HTMLElement).closest("a");
    const box = links.current;
    if (!a || !box) return;
    box.style.setProperty("--px", `${a.offsetLeft}px`);
    box.style.setProperty("--pw", `${a.offsetWidth}px`);
    box.style.setProperty("--po", "1");
  };

  if (!isMounted) return null;

  return createPortal(
    <header
      ref={(el) => {
        navEl = el;
      }}
      className={g.wrap}
      data-scrolled={scrolled || undefined}
    >
      <div ref={bar} className={g.bar} data-dark={dark || undefined} data-refract={refract || undefined} onPointerMove={glow}>
        <span className={g.shine} aria-hidden="true" />

        <div className={g.start}>
          <a href="#top" className={g.brand} aria-label="Goonj home">
            <BrandLogo tone={dark ? "white" : "black"} className={g.logo} priority />
          </a>
          <VersionSwitch />
        </div>

        <nav
          ref={links}
          aria-label="Sections"
          className={g.links}
          onPointerOver={slide}
          onPointerLeave={() => links.current?.style.setProperty("--po", "0")}
        >
          <span className={g.pill} aria-hidden="true" />
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} aria-current={href === "#top" && overHero ? "page" : undefined}>
              {label}
            </a>
          ))}
        </nav>

        <GlossLink href={GOONJ.cta} size="sm" className={g.cta}>
          Get early access
          <span className={g.arrow}>
            <ArrowRight size={14} weight="bold" />
          </span>
        </GlossLink>
      </div>

      <svg className={g.defs} aria-hidden="true">
        <filter id="goonj-lens" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={LENS} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="38" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </header>,
    document.body,
  );
}
