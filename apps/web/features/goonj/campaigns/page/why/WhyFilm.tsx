"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

import w from "./why.module.css";

/** One clip per point, in order (public/goonj/why, see SOURCES.txt there). */
const CLIPS = ["personal", "practice", "real", "progress", "talk", "last"];

/**
 * "Goonj gets you" as a stack of full-screen film panels. Each panel holds a
 * two-tone video (the clip's light and shade, coloured orange or deep teal)
 * with the point in large thin type. As you scroll, the next panel slides up
 * over the last one, opening from a rounded inset card to full bleed while
 * its video catches up; the covered panel sinks back and dims. The headline
 * words rise out of their line masks as each panel arrives.
 * Reduced motion: plain stacked panels on their posters, no video playback.
 */
export function WhyFilm({ items }: { items: { title: string; body: string }[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const panels = Array.from(el.querySelectorAll<HTMLElement>("[data-panel]"));

    // Only the panels on screen play (and load) their video.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target.querySelector("video");
          if (!v || reduce) continue;
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { rootMargin: "15% 0px" },
    );
    panels.forEach((p) => io.observe(p));
    if (reduce) return () => io.disconnect();

    gsap.registerPlugin(ScrollTrigger);
    el.setAttribute("data-live", "");

    const ctx = gsap.context(() => {
      const q = (p: Element, sel: string) => p.querySelector<HTMLElement>(sel);
      panels.forEach((panel, i) => {
        const frame = q(panel, "[data-frame]");
        const media = q(panel, "[data-media]");
        if (!frame || !media) return;

        // Arrival: inset card → full bleed; the video drifts slower than the page.
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: panel, start: "top bottom", end: "top top", scrub: 0.9 },
        });
        tl.fromTo(
          frame,
          { clipPath: "inset(0% 7% 0% 7% round 44px)" },
          { clipPath: "inset(0% 0% 0% 0% round 0px)" },
          0,
        ).fromTo(media, { yPercent: 18 }, { yPercent: 0 }, 0);

        // The panel underneath sinks back as this one covers it.
        const prev = panels[i - 1];
        const pf = prev && q(prev, "[data-frame]");
        if (prev && pf) {
          tl.fromTo(
            pf,
            { scale: 1, clipPath: "inset(0% 0% 0% 0% round 0px)" },
            { scale: 0.9, clipPath: "inset(0% 0% 0% 0% round 44px)", immediateRender: false },
            0,
          )
            .fromTo(q(prev, "[data-dim]"), { opacity: 0 }, { opacity: 0.7, immediateRender: false }, 0)
            .fromTo(q(prev, "[data-media]"), { yPercent: 0 }, { yPercent: -10, immediateRender: false }, 0);
        }

        // Once fully covered, the panel underneath stops playing.
        const pv = prev?.querySelector("video");
        if (pv) {
          ScrollTrigger.create({
            trigger: panel,
            start: "top top",
            onEnter: () => pv.pause(),
            onLeaveBack: () => void pv.play().catch(() => {}),
          });
        }

        // Words rise out of their masks, then the rest follows.
        gsap
          .timeline({
            scrollTrigger: { trigger: panel, start: "top 40%", toggleActions: "play none none reverse" },
          })
          .from(panel.querySelectorAll("[data-word] > span"), {
            yPercent: 118,
            duration: 1.15,
            ease: "expo.out",
            stagger: 0.07,
          })
          .from(
            panel.querySelectorAll("[data-fade]"),
            { y: 20, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 },
            0.15,
          );
      });
    }, el);

    return () => {
      ctx.revert();
      io.disconnect();
      el.removeAttribute("data-live");
    };
  }, []);

  return (
    <div ref={root} className={w.stack}>
      {items.map((it, i) => {
        const clip = CLIPS[i % CLIPS.length];
        return (
          <article
            key={it.title}
            className={w.panel}
            data-panel
            data-tone={i % 2 ? "ink" : "ember"}
            data-side={i % 2 ? "right" : "left"}
          >
            <div className={w.frame} data-frame>
              <div className={w.media} data-media aria-hidden>
                <video
                  className={w.video}
                  muted
                  loop
                  playsInline
                  preload={i === 0 ? "metadata" : "none"}
                  poster={`/goonj/why/${clip}.jpg`}
                >
                  <source src={`/goonj/why/${clip}.mp4`} type="video/mp4" />
                </video>
              </div>
              <div className={w.shade} aria-hidden />
              <div className={w.content}>
                <span className={w.pill} data-fade>
                  Why Goonj
                </span>
                <h3 className={w.title} aria-label={it.title}>
                  {it.title.split(" ").map((word, k) => (
                    <span key={k} className={w.word} data-word aria-hidden>
                      <span>{word}</span>
                    </span>
                  ))}
                </h3>
                <p className={w.body} data-fade>
                  {it.body}
                </p>
              </div>
              <div className={w.dim} data-dim aria-hidden />
            </div>
          </article>
        );
      })}
    </div>
  );
}
