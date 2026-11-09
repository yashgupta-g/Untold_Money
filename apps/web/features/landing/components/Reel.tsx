"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";
import { REEL } from "../content";
import shared from "../landing.module.css";
import { MQ_DESKTOP_MOTION } from "../motion";
import styles from "./reel.module.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * The reel: the people UntoldMoney is for, alternating with the screens they
 * open most. On wide screens the section pins and scrolling the page slides
 * the whole row sideways, end to end. Phones and reduced motion get a plain
 * swipeable row.
 */
export function Reel() {
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!root || !pin || !track) return;

    const mm = gsap.matchMedia();
    mm.add(MQ_DESKTOP_MOTION, () => {
      root.dataset.pinned = "true";
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
            progressRef.current?.style.setProperty("--p", self.progress.toFixed(3));
          },
        },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        delete root.dataset.pinned;
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={rootRef} id="reel" className={styles.reel} aria-labelledby="reel-title">
      <div ref={pinRef} className={styles.pin}>
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
              <div className={styles.media}>
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
