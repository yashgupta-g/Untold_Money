"use client";

import type { PointerEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

import gl from "./gloss.module.css";

/**
 * A call to action finished like the footer's glass "Goonj": the logo's
 * warm-to-teal gradient as a glossy, bevelled slab, with a specular light
 * that glides across it on its own and follows the pointer on hover.
 */
/* the specular light follows the pointer while hovered, then glides on its own again */
const light = {
  onPointerEnter: (e: PointerEvent<HTMLElement>) => e.currentTarget.setAttribute("data-live", ""),
  onPointerMove: (e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  },
  onPointerLeave: (e: PointerEvent<HTMLElement>) => e.currentTarget.removeAttribute("data-live"),
};

export function GlossLink({
  href,
  size = "lg",
  className,
  children,
}: {
  href: string;
  size?: "lg" | "sm";
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={cn(gl.gloss, size === "sm" && gl.sm, className)} {...light}>
      {children}
    </a>
  );
}

/**
 * The secondary partner to GlossLink: clear frosted glass with a thin rim in
 * the same logo gradient and the same gliding light (half a beat behind, so
 * the two shine in turn), and a play icon in a small glossy gradient pearl.
 */
export function GlossPlay({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={gl.ghost} onClick={onClick} {...light}>
      <span className={gl.pearl} aria-hidden="true">
        <svg viewBox="0 0 12 12">
          <path d="M3.5 2.2v7.6L10 6z" />
        </svg>
      </span>
      {children}
    </button>
  );
}
