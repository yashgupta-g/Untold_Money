"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type KeyboardEvent,
} from "react";
import dynamic from "next/dynamic";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CaretDown, CaretLeft, CaretRight, CaretUp } from "@phosphor-icons/react";

import styles from "./switcher.module.css";

/*
 * Temporary design preview: every hero option is selectable from a dock at
 * the bottom of the screen. The choice is kept in the URL (?hero=…) and in
 * localStorage, so a link to a specific option can be shared. Remove this
 * file, and render the chosen hero directly, once one is picked.
 */

const loading = () => <div className={styles.placeholder} />;

export const HERO_OPTIONS = [
  {
    id: "crew",
    label: "The crew",
    style: "Anthropomorphic",
    Component: dynamic(() => import("./HeroCrew").then((m) => m.HeroCrew), { loading }),
  },
  {
    id: "xray",
    label: "X-ray",
    style: "Cursor lens",
    Component: dynamic(() => import("./HeroXray").then((m) => m.HeroXray), { loading }),
  },
  {
    id: "exploded",
    label: "Taken apart",
    style: "Exploded view",
    Component: dynamic(() => import("./HeroExploded").then((m) => m.HeroExploded), { loading }),
  },
] satisfies { id: string; label: string; style: string; Component: ComponentType }[];

type HeroId = (typeof HERO_OPTIONS)[number]["id"];
const DEFAULT: HeroId = "crew";
const KEY = "um-hero-option";

/* ---------- selection store (URL + localStorage) ---------- */
let current: HeroId | null = null;
const listeners = new Set<() => void>();

const isHeroId = (v: unknown): v is HeroId => HERO_OPTIONS.some((o) => o.id === v);

function readSelection(): HeroId {
  if (current) return current;
  let stored: string | null = null;
  try {
    stored = new URLSearchParams(window.location.search).get("hero") ?? localStorage.getItem(KEY);
  } catch {
    // Storage can be blocked; the default still works.
  }
  current = isHeroId(stored) ? stored : DEFAULT;
  return current;
}

function selectHero(id: HeroId) {
  current = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Not persisted; the URL still carries the choice.
  }
  const url = new URL(window.location.href);
  url.searchParams.set("hero", id);
  window.history.replaceState(window.history.state, "", url);
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function HeroSwitcher() {
  const selected = useSyncExternalStore(subscribe, readSelection, () => DEFAULT);
  const option = HERO_OPTIONS.find((o) => o.id === selected) ?? HERO_OPTIONS[0];
  const wrapRef = useRef<HTMLDivElement>(null);

  // A new hero changes the page height: re-measure every scroll trigger
  // below it, and let the nav re-read the hero it sits over.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        window.dispatchEvent(new Event("scroll"));
      });
    };
    // Size changes, and the moment a lazily loaded option replaces its
    // placeholder (often at the same height), both need a fresh measure.
    const resize = new ResizeObserver(refresh);
    const mutate = new MutationObserver(refresh);
    resize.observe(wrap);
    mutate.observe(wrap, { childList: true });
    refresh();
    return () => {
      resize.disconnect();
      mutate.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [selected]);

  const { Component } = option;
  return (
    <>
      <div ref={wrapRef}>
        <Component key={option.id} />
      </div>
      <Dock selected={option.id} />
    </>
  );
}

function Dock({ selected }: { selected: HeroId }) {
  const [open, setOpen] = useState(true);
  const index = HERO_OPTIONS.findIndex((o) => o.id === selected);
  const step = (delta: number) => {
    const next = (index + delta + HERO_OPTIONS.length) % HERO_OPTIONS.length;
    selectHero(HERO_OPTIONS[next].id);
    window.scrollTo({ top: 0 });
  };
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the current option in view on narrow screens, without moving the page.
  useEffect(() => {
    const list = listRef.current;
    const el = optionRefs.current[index];
    if (!list || !el) return;
    list.scrollTo({
      left: el.offsetLeft - (list.clientWidth - el.clientWidth) / 2,
      behavior: "smooth",
    });
  }, [index, open]);

  // Arrow keys move through the options like a radio group.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      (index + (e.key === "ArrowRight" ? 1 : -1) + HERO_OPTIONS.length) % HERO_OPTIONS.length;
    selectHero(HERO_OPTIONS[next].id);
    optionRefs.current[next]?.focus();
  };

  if (!open) {
    return (
      <div className={styles.dock} data-open="false">
        <button type="button" className={styles.collapsed} onClick={() => setOpen(true)}>
          <span className={styles.count}>
            {index + 1}/{HERO_OPTIONS.length}
          </span>
          Hero: {HERO_OPTIONS[index].label}
          <CaretUp size={14} weight="bold" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.dock} data-open="true" role="region" aria-label="Hero design preview">
      <span className={styles.title}>Hero design</span>
      <button
        type="button"
        className={styles.icon}
        onClick={() => step(-1)}
        aria-label="Previous design"
      >
        <CaretLeft size={14} weight="bold" aria-hidden="true" />
      </button>
      <div
        ref={listRef}
        className={styles.list}
        role="radiogroup"
        aria-label="Hero design"
        onKeyDown={onKeyDown}
      >
        {HERO_OPTIONS.map((o, i) => (
          <button
            key={o.id}
            ref={(el) => {
              optionRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={o.id === selected}
            tabIndex={o.id === selected ? 0 : -1}
            className={styles.option}
            onClick={() => {
              selectHero(o.id);
              window.scrollTo({ top: 0 });
            }}
          >
            <span className={styles.num}>{i + 1}</span>
            <span className={styles.optionText}>
              {o.label}
              <small>{o.style}</small>
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className={styles.icon}
        onClick={() => step(1)}
        aria-label="Next design"
      >
        <CaretRight size={14} weight="bold" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.icon}
        onClick={() => setOpen(false)}
        aria-label="Minimise design picker"
      >
        <CaretDown size={14} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}
