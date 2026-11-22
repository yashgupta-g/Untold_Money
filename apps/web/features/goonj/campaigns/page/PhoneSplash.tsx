"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import c from "./cta-banner.module.css";

/**
 * A photo-real tilted phone (public/goonj/mockups/tilt-frame.webp) showing
 * Goonj's own launch splash: the orange Goonj logo with a warm glow, and the
 * promise beneath it. Branding only, no app screens. The screen is laid out at the
 * mockup's 1200-px scale and set into the frame with a measured matrix3d;
 * --k fits it to the box.
 */
export function PhoneSplash() {
  const mock = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mock.current;
    if (!el) return;
    const fit = () => el.style.setProperty("--k", String(el.clientWidth / 1200));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return (
    <div className={c.stage} aria-hidden>
      <span className={c.halo} />
      <div ref={mock} className={c.mock}>
        <div className={`${c.screen} ${c.screenBack}`} />
        <div className={c.screen}>
          <span className={c.splashGlow} />
          <span className={c.splashLogo}>
            <Image src="/goonj/goonj-logo-script.svg" alt="" width={233} height={200} />
          </span>
          <span className={c.splashLine}>Become more valuable at work</span>
        </div>
        <Image src="/goonj/mockups/tilt-frame.webp" alt="" width={1200} height={1311} sizes="480px" className={c.frame} />
      </div>
      <span className={c.floor} />
    </div>
  );
}
