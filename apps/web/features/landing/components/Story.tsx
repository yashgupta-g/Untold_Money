"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";
import { STORY } from "../content";
import shared from "../landing.module.css";
import { MQ_DESKTOP_MOTION } from "../motion";
import styles from "./story.module.css";

gsap.registerPlugin(ScrollTrigger);

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Scrollytelling: on wide screens the section pins, the phone stays put and
 * each scroll step wipes in the next screen while its copy and callouts
 * swap. Elsewhere the steps simply stack.
 */
export function Story() {
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    if (!root || !pin) return;
    const q = gsap.utils.selector(root);

    const mm = gsap.matchMedia();
    mm.add(MQ_DESKTOP_MOTION, () => {
      root.dataset.pinned = "true";
      // The shared reveal would fight this timeline over the same elements.
      pin.dataset.revealSkip = "true";

      const steps = STORY.map((_, i) => ({
        text: q(`[data-step="${i}"] [data-story-text]`),
        shot: q(`[data-step="${i}"] [data-story-shot]`),
        callouts: q(`[data-step="${i}"] [data-story-callout]`),
      }));
      const bars = q("[data-story-bar]");
      const last = steps.length - 1;

      steps.slice(1).forEach((s) => {
        gsap.set(s.text, { opacity: 0, y: 40 });
        gsap.set(s.shot, { clipPath: "inset(100% 0% 0% 0%)" });
        gsap.set(s.callouts, { opacity: 0, y: 20 });
      });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => `+=${window.innerHeight * last * 1.2}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      // One unit of timeline per step; the hand-off happens late in each unit.
      steps.forEach((s, i) => {
        tl.fromTo(bars[i], { scaleX: 0 }, { scaleX: 1, duration: 1 }, i);
        if (i === last) return;
        const next = steps[i + 1];
        const at = i + 0.55;
        tl.to(s.text, { opacity: 0, y: -40, duration: 0.3, ease: "power2.in" }, at)
          .to(s.callouts, { opacity: 0, y: -16, duration: 0.25, ease: "power2.in" }, at)
          .to(
            next.shot,
            { clipPath: "inset(0% 0% 0% 0%)", duration: 0.45, ease: "power3.inOut" },
            at,
          )
          .to(next.text, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, at + 0.22)
          .to(
            next.callouts,
            { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "back.out(1.5)" },
            at + 0.3,
          );
      });

      return () => {
        delete root.dataset.pinned;
        delete pin.dataset.revealSkip;
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={rootRef} id="story" className={styles.story}>
      <div className={shared.container}>
        <div className={cn(shared.sectionHead, shared.sectionHeadCenter)} data-reveal>
          <span className={shared.eyebrow}>How it works</span>
          <h2 className={shared.h2}>Three questions every investor asks</h2>
          <p className={shared.lede}>
            UntoldMoney answers each one on a single screen, with the inputs in view.
          </p>
        </div>
      </div>

      <div ref={pinRef} className={styles.pin}>
        <div className={cn(shared.container, styles.stage)}>
          {STORY.map((step, i) => (
            <article key={step.id} className={styles.step} data-step={i}>
              <div className={styles.text} data-story-text data-reveal>
                <span className={cn(styles.count, shared.num)}>
                  {pad(i + 1)}
                  <span> / {pad(STORY.length)}</span>
                </span>
                <p className={styles.question}>{step.question}</p>
                <h3 className={styles.title}>{step.title}</h3>
                <p className={styles.body}>{step.body}</p>
              </div>

              <div className={styles.device} data-story-device data-reveal>
                <Image
                  className={styles.shot}
                  data-story-shot
                  src={step.image.src}
                  width={step.image.width}
                  height={step.image.height}
                  sizes="(max-width: 1023px) 90vw, 560px"
                  alt={step.imageAlt}
                />
                <span
                  className={cn(styles.callout, styles.calloutA)}
                  data-story-callout
                  aria-hidden="true"
                >
                  {step.callouts[0]}
                </span>
                <span
                  className={cn(styles.callout, styles.calloutB)}
                  data-story-callout
                  aria-hidden="true"
                >
                  {step.callouts[1]}
                </span>
              </div>
            </article>
          ))}

          <div className={styles.progress} aria-hidden="true">
            {STORY.map((step) => (
              <i key={step.id}>
                <b data-story-bar />
              </i>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
