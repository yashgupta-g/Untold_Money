"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

import { MQ_MOTION, MQ_REDUCE, REVEAL, STAGGER } from "../motion";

gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText);

/**
 * Page-wide motion: Lenis inertia scroll driven by GSAP's ticker, the shared
 * viewport reveal for every `[data-reveal]` element, section headings that
 * resolve word by word out of a blur, counters, the brand coin's drop and
 * the footer wordmark.
 *
 * Rendered last on the page so its ScrollTriggers are created after the
 * section pins above it, which keeps their start positions correct.
 */
export function LandingMotion() {
  useEffect(() => {
    const reduce = window.matchMedia(MQ_REDUCE).matches;
    let lenis: Lenis | null = null;
    const tick = (time: number) => lenis?.raf(time * 1000);

    if (!reduce) {
      lenis = new Lenis({ autoRaf: false, lerp: 0.1, anchors: { offset: -88 } });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const mm = gsap.matchMedia();
    // Reduced motion: no hiding at all, so content is simply there.
    mm.add(MQ_MOTION, () => {
      // Anything already scrolled past on load is simply left visible.
      const ahead = (el: Element) => el.getBoundingClientRect().bottom >= 0;
      const ease = CustomEase.create("landing-reveal", REVEAL.ease);

      // Section headings: each word sharpens out of a blur as it rises.
      // aria "auto" labels the heading with its full text for screen readers.
      gsap.utils
        .toArray<HTMLElement>("main h2")
        .filter(ahead)
        .forEach((heading) => {
          SplitText.create(heading, {
            type: "words",
            tag: "span",
            aria: "auto",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.words, {
                opacity: 0,
                yPercent: 35,
                filter: "blur(12px)",
                duration: 0.9,
                ease,
                stagger: 0.07,
                clearProps: "filter,transform",
                scrollTrigger: { trigger: heading, start: "top 88%", once: true },
              }),
          });
        });

      // Counters count up from zero. Figure spaces hold the final width, so
      // nothing beside the number moves while it counts. The target is kept
      // in data-count, so a re-run (or React's dev double effect) never reads
      // back a half-counted number; cleanup puts the real figure back.
      gsap.utils
        .toArray<HTMLElement>("[data-count]")
        .filter(ahead)
        .forEach((el) => {
          const node = el.firstChild;
          if (!node || node.nodeType !== Node.TEXT_NODE) return;
          const end = Number(el.dataset.count || node.nodeValue?.trim());
          if (!Number.isFinite(end)) return;
          el.dataset.count = String(end);
          const width = String(end).length;
          const state = { n: 0 };
          const write = () => {
            node.nodeValue = String(Math.round(state.n)).padStart(width, "\u2007");
          };
          write();
          gsap.to(state, {
            n: end,
            duration: 1.6,
            ease: "power3.out",
            onUpdate: write,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

      // The brand coin spins down into the logo rows, then its light comes on.
      const coin = document.querySelector<HTMLElement>("[data-coin]");
      if (coin && ahead(coin)) {
        gsap
          .timeline({ scrollTrigger: { trigger: coin, start: "top 85%", once: true } })
          .from(coin, {
            yPercent: -170,
            rotateY: -540,
            opacity: 0,
            duration: 1.5,
            ease: "power3.out",
          })
          .from(
            "[data-coin-glow]",
            { opacity: 0, scale: 0.4, duration: 1, ease: "power2.out" },
            "-=0.6",
          );
      }

      // Footer wordmark rises out of the page edge.
      const wordmark = document.querySelector<SVGSVGElement>("[data-wordmark]");
      if (wordmark) {
        gsap.from(wordmark.querySelector("text"), {
          yPercent: 70,
          opacity: 0,
          duration: 1.2,
          ease,
          scrollTrigger: { trigger: wordmark, start: "top 98%", once: true },
        });
      }

      // Sections that animate their own content opt out with data-reveal-skip.
      const items = gsap.utils
        .toArray<HTMLElement>("[data-reveal]")
        .filter((el) => !el.closest("[data-reveal-skip]"))
        .filter(ahead);
      if (!items.length) return;

      // Opacity rather than visibility, so unrevealed content stays in the
      // accessibility tree for screen readers navigating ahead.
      gsap.set(items, { opacity: 0, y: REVEAL.rise });
      ScrollTrigger.batch(items, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: REVEAL.duration,
            ease,
            stagger: STAGGER,
            overwrite: true,
            clearProps: "transform",
          }),
      });
    });

    // Counters: hand the real figures back when the motion context is reverted.
    mm.add(MQ_MOTION, () => () => {
      document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const node = el.firstChild;
        if (node?.nodeType === Node.TEXT_NODE && el.dataset.count)
          node.nodeValue = el.dataset.count;
      });
    });

    // Web fonts change line lengths, which moves every trigger below.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      mm.revert();
      gsap.ticker.remove(tick);
      lenis?.destroy();
    };
  }, []);

  return null;
}
