"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";
import { METHOD } from "../content";
import shared from "../landing.module.css";
import { MQ_MOTION } from "../motion";
import styles from "./method.module.css";

gsap.registerPlugin(ScrollTrigger);

/** Validation steps beside a sticky heading; the rail fills as you read. */
export function Method() {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const mm = gsap.matchMedia();
    mm.add(MQ_MOTION, () => {
      gsap.fromTo(
        list.querySelector("[data-method-fill]"),
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: list, start: "top 70%", end: "bottom 60%", scrub: 0.4 },
        },
      );
      gsap.utils.toArray<HTMLElement>("[data-method-step]", list).forEach((step) => {
        ScrollTrigger.create({
          trigger: step,
          start: "top 62%",
          toggleClass: { targets: step, className: styles.lit },
        });
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section id="method" className={cn(shared.section, styles.method)}>
      <div className={cn(shared.container, styles.grid)}>
        <div className={styles.head}>
          <div className={shared.sectionHead} data-reveal>
            <span className={shared.eyebrow}>Method</span>
            <h2 className={shared.h2}>How predictions are validated</h2>
            <p className={shared.lede}>
              A model earns a place on screen only after it is tested on data it has never seen.
            </p>
          </div>
        </div>

        <div ref={listRef} className={styles.steps}>
          <span className={styles.rail} aria-hidden="true">
            <span data-method-fill />
          </span>
          <ol className={styles.list}>
            {METHOD.map((step, i) => (
              <li key={step.title} className={styles.step} data-method-step data-reveal>
                <span className={cn(styles.dot, shared.num)}>{i + 1}</span>
                <h3 className={shared.h3}>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
