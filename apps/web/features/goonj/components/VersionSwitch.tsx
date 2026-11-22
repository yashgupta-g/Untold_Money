"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";

import styles from "./switch.module.css";

type Version = "story" | "talk" | "app" | "sky";

const VERSIONS: { id: Version; label: string; href: string }[] = [
  { id: "story", label: "Latest", href: "/goonj" },
  { id: "talk", label: "New hero", href: "/goonj?v=talk" },
  { id: "app", label: "App", href: "/goonj?v=app" },
  { id: "sky", label: "Sky", href: "/goonj?v=sky" },
];

/* the version comes from the URL, so any nav can drop the switch in without props */
const noop = () => () => {};
function currentVersion(): Version {
  const v = new URLSearchParams(window.location.search).get("v");
  return VERSIONS.some((x) => x.id === v) ? (v as Version) : "story";
}

/**
 * Design preview: flip between the Goonj directions. A compact pill that
 * lives in the navbar ("Version · New hero"), opening a small menu of the
 * four. Kept in the URL so each version is shareable.
 */
export function VersionSwitch({ className }: { className?: string }) {
  const current = useSyncExternalStore(noop, currentVersion, () => "story" as Version);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const label = VERSIONS.find((v) => v.id === current)?.label ?? "Latest";

  // close on a click elsewhere or Escape
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className={[styles.wrap, className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className={styles.pill}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Design version: ${label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.label}>Version</span>
        <b>{label}</b>
        <CaretDown size={11} weight="bold" className={styles.caret} />
      </button>
      {open && (
        <nav className={styles.menu} aria-label="Design version" role="menu">
          {VERSIONS.map((v) => (
            <a key={v.id} href={v.href} role="menuitem" aria-current={current === v.id ? "page" : undefined}>
              {v.label}
              {current === v.id && <Check size={13} weight="bold" />}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
