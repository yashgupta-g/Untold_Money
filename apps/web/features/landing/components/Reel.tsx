"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";
import { REEL } from "../content";
import shared from "../landing.module.css";
import type { Flow } from "./flux";
import styles from "./reel.module.css";

gsap.registerPlugin(ScrollTrigger);

/** Pinned reel with WebGL on screens wide enough to scroll it sideways. */
const MQ_REEL = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";
const RADIUS = 22;

/**
 * The reel: the people UntoldMoney is for, alternating with the screens they
 * open most. On wide screens the section pins and scrolling drives the reel
 * sideways while a Three.js layer bends and ripples the cards with the
 * scroll speed (see flux.ts). Phones get a plain swipeable row.
 */
export function Reel() {
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    const track = trackRef.current;
    const canvas = canvasRef.current;
    if (!root || !pin || !track || !canvas) return;

    const mm = gsap.matchMedia();
    mm.add(MQ_REEL, () => {
      root.dataset.pinned = "true";
      const flow: Flow = { target: 0, value: 0 };
      const distance = () => Math.max(0, track.scrollWidth - pin.clientWidth);

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            flow.target = gsap.utils.clamp(-1, 1, self.getVelocity() / 2400);
            progressRef.current?.style.setProperty("--p", self.progress.toFixed(3));
          },
        },
      });

      // Three.js loads only here, so phones and reduced motion never fetch it,
      // and only once the reel is about a screen away, so it never competes
      // with the hero for the main thread.
      let disposed = false;
      let gl: { dispose: () => void } | null = null;
      const start = () =>
        import("./flux")
          .then(({ createFlux }) => {
            if (disposed) return;
            gl = createFlux({
              canvas,
              stage: pin,
              cards: Array.from(track.querySelectorAll<HTMLElement>("[data-src]")),
              flow,
              radius: RADIUS,
              onReady: () => {
                root.dataset.gl = "true";
              },
            });
          })
          .catch(() => {
            // No WebGL: the DOM images simply stay visible.
          });
      const near = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          near.disconnect();
          start();
        },
        { rootMargin: "100% 0px" },
      );
      near.observe(root);

      return () => {
        disposed = true;
        near.disconnect();
        gl?.dispose();
        tween.scrollTrigger?.kill();
        tween.kill();
        delete root.dataset.pinned;
        delete root.dataset.gl;
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={rootRef} id="reel" className={styles.reel} aria-labelledby="reel-title">
      <div ref={pinRef} className={styles.pin}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

        <div className={cn(shared.container, styles.head)} data-reveal>
          <div className={styles.headText}>
            <span className={shared.eyebrow}>Who it&rsquo;s for</span>
            <h2 id="reel-title" className={shared.h2}>
              Built for every kind of investor
            </h2>
          </div>
          <p className={styles.lede}>
            The people UntoldMoney is made for, and the screens they open most.
          </p>
        </div>

        <ul ref={trackRef} className={styles.track}>
          {REEL.map((item, i) => (
            <li key={item.src} className={styles.card} data-shape={item.shape}>
              <div className={styles.media} data-src={item.src}>
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes={item.shape === "landscape" ? "560px" : "340px"}
                />
              </div>
              <div className={styles.caption}>
                <span className={styles.index}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.captionText}>
                  <b>{item.title}</b>
                  <small>{item.note}</small>
                </span>
                <span className={styles.kind} data-kind={item.kind}>
                  {item.kind}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <span className={styles.progress} aria-hidden="true">
          <span ref={progressRef} />
        </span>
      </div>
    </section>
  );
}
