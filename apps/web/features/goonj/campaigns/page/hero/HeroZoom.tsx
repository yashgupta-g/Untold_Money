"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, type ReactNode } from "react";

import e from "./hero-fx.module.css";

/**
 * The hero's media card, which swells into the whole screen as you scroll:
 * the card settles in the middle of the viewport, then its rounded frame
 * opens out to full bleed. The picture is laid out in the frame itself (so
 * the card shows the whole face, not a slice of a full-screen image) and
 * grows with it. Around the resting card, warm smoke keeps curling along its
 * edges, and fades away as it opens. Then the page moves on.
 * The frame is a clip-path driven by CSS variables (--ix, --it, --r), so the
 * overlays inside (the faces, the creator tag) ride along with its corner.
 * Without motion (or JS) it's the plain card in the flow.
 */
export function HeroZoom({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    el.setAttribute("data-live", "");

    // The card's resting size: as wide as the content column, 21:9 (4:3.4 on
    // phones), never taller than 72% of the screen.
    const card = () => {
      const vw = el.clientWidth;
      const vh = window.innerHeight;
      const gutter = Math.max(16, Math.min(40, vw * 0.04));
      const cw = Math.min(vw - gutter * 2, 1240);
      const ratio = vw <= 720 ? 3.4 / 4 : 9 / 21;
      const ch = Math.min(cw * ratio, vh * 0.72);
      return { ix: (vw - cw) / 2, it: (vh - ch) / 2, r: vw <= 720 ? 24 : 32 };
    };

    // Pull the stage up so the card sits right under the hero copy, not in
    // the middle of an empty screen.
    const place = () => {
      const { it } = card();
      // close the gap, so the top of the card peeks into the first screen
      el.style.setProperty("--pull", `${Math.max(0, it - 8)}px`);
    };
    place();

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.9,
            invalidateOnRefresh: true,
            onRefreshInit: place,
          },
        })
        .fromTo(
          el,
          { "--ix": () => `${card().ix}px`, "--it": () => `${card().it}px`, "--r": () => `${card().r}px` },
          { "--ix": "0px", "--it": "0px", "--r": "0px" },
          0,
        )
        .fromTo(el, { "--k": 1.06 }, { "--k": 1 }, 0)
        .fromTo(el, { "--glow": 1 }, { "--glow": 0, duration: 0.6 }, 0);

      // parallax: as the card scrolls in, the photo inside moves a little
      // slower than its frame, then settles before the card opens out
      gsap.fromTo(
        el,
        { "--py": "-3%" },
        {
          "--py": "0%",
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: 0.9 },
        },
      );
    }, el);

    return () => {
      ctx.revert();
      el.removeAttribute("data-live");
      el.style.removeProperty("--pull");
    };
  }, []);

  return (
    <div ref={root} className={e.zoom}>
      <div className={e.zoomStage}>
        <div className={e.rim} aria-hidden>
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className={e.card}>
          <div className={e.picture}>{children}</div>
          {overlay}
        </div>
      </div>
    </div>
  );
}
