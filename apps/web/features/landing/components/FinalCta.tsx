"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { MEDIA } from "../content";
import shared from "../landing.module.css";
import { MQ_MOTION } from "../motion";
import styles from "./final.module.css";
import { Magnetic } from "./Magnetic";

gsap.registerPlugin(ScrollTrigger);

/** Closing panel: the hero's photo-panel language, bookending the page. */
export function FinalCta() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MQ_MOTION, () => {
      gsap.fromTo(
        root.querySelector("[data-final-photo]"),
        { yPercent: -6 },
        {
          yPercent: 6,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={rootRef} className={styles.final}>
      <div className={styles.panel}>
        <div className={styles.photo} data-final-photo aria-hidden="true">
          <Image src={MEDIA.mountains.src} alt="" fill sizes="100vw" className={styles.photoImg} />
        </div>
        <div className={styles.scrim} aria-hidden="true" />

        <div className={styles.copy}>
          <span className={styles.eyebrow} data-reveal>
            Free to start
          </span>
          <h2 className={styles.title} data-reveal>
            Bring your money into one place.
          </h2>
          <p className={styles.lede} data-reveal>
            Add your holdings, run AI analysis on the stocks you follow and place your next trade
            through your broker.
          </p>
          <div className={styles.ctas} data-reveal>
            <Magnetic>
              <Link className={cn(shared.btn, shared.btnPrimary)} href="/register">
                Get started free
                <span className={shared.btnArrow}>
                  <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
                </span>
              </Link>
            </Magnetic>
            <Link className={cn(shared.btn, styles.btnGlass)} href="/login">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
