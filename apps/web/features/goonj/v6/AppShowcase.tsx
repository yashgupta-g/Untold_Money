"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";
import { MQ_DESKTOP_MOTION, MQ_MOTION } from "@/features/landing/motion";

import u from "../v4/ui.module.css";
import { HdPhone } from "./HdPhone";
import sc from "./showcase.module.css";

gsap.registerPlugin(ScrollTrigger);

/*
 * The app at a glance: real Goonj screens fanned on a wheel like a hand of
 * cards, every phone pointing out from a pivot below the stage. The wheel
 * turns one phone at a time: scroll-scrubbed and snapped while the stage is
 * pinned on desktop, on a gentle timer elsewhere, still for reduced motion.
 */
const SCREENS = [
  { src: "/goonj/app/hd/welcome-knows.webp", alt: "Welcome: Goonj knows you deeply" },
  { src: "/goonj/app/hd/session0.webp", alt: "Session 0: Aarya asks about your work" },
  { src: "/goonj/app/hd/suggested-tracks.webp", alt: "Tracks suggested from your answers" },
  { src: "/goonj/app/hd/track.webp", alt: "The Speaking Confidence track" },
  { src: "/goonj/app/hd/playbook.webp", alt: "The Clear Manager Update playbook" },
  { src: "/goonj/app/hd/aarya-talk.webp", alt: "Talking with Aarya" },
  { src: "/goonj/app/hd/session1-complete.webp", alt: "Session 1 complete" },
  { src: "/goonj/app/hd/first-echo.webp", alt: "The First Echo milestone, achieved" },
  { src: "/goonj/app/hd/transformation.webp", alt: "Your transformation" },
  { src: "/goonj/app/hd/welcome-adapts.webp", alt: "Welcome: Goonj adapts to your reality" },
  { src: "/goonj/app/hd/session-complete.webp", alt: "Session 0 complete" },
  { src: "/goonj/app/hd/welcome-rise.webp", alt: "Welcome: Goonj helps you rise in real life" },
];

/* 15 slots on the wheel; screens repeat 12 slots apart, never in view together. */
const SLOTS = Array.from({ length: 15 }, (_, k) => SCREENS[k % SCREENS.length]);
/* the slot at the top of the wheel before it turns, and how far it turns */
const START = 5;
const TURNS = 5;

const LABELS_L = ["Mobile app", "Voice + video", "Hindi + English"];
const LABELS_R = ["Tracks", "Milestones", "Real-world activity"];

export function AppShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const wheel = wheelRef.current;
    if (!section || !pin || !wheel) return;

    const mm = gsap.matchMedia();

    // Desktop: the stage pins and scrolling turns the wheel, snapping per phone.
    mm.add(MQ_DESKTOP_MOTION, () => {
      section.dataset.pinned = "";
      gsap.set(wheel, { "--turn": 0 });
      const bands = pin.querySelector<HTMLElement>("[data-bands]");
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: `+=${TURNS * 45}%`,
          pin: true,
          scrub: 0.8,
          snap: { snapTo: 1 / TURNS, duration: { min: 0.25, max: 0.7 }, delay: 0.05, ease: "power3.inOut" },
          invalidateOnRefresh: true,
        },
      });
      tl.to(wheel, { "--turn": TURNS, duration: TURNS }, 0);
      // the satin light bands drift a touch against the turn
      if (bands) tl.to(bands, { xPercent: -6, duration: TURNS }, 0);
      return () => {
        delete section.dataset.pinned;
      };
    });

    // Phones and tablets: the wheel steps on its own while in view.
    mm.add(`(max-width: 1023px) and ${MQ_MOTION}`, () => {
      let turn = 0;
      let dir = 1;
      let timer = 0;
      const step = () => {
        if (turn + dir > TURNS || turn + dir < 0) dir = -dir;
        turn += dir;
        gsap.to(wheel, { "--turn": turn, duration: 0.9, ease: "power3.inOut" });
      };
      const io = new IntersectionObserver(([e]) => {
        window.clearInterval(timer);
        if (e.isIntersecting) timer = window.setInterval(step, 2600);
      });
      io.observe(wheel);
      return () => {
        io.disconnect();
        window.clearInterval(timer);
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} className={sc.section} aria-labelledby="showcase-title">
      <div ref={pinRef} className={sc.pin}>
        <div className={cn(u.head, sc.head)}>
          <span className={u.kicker}>Inside the app</span>
          <h2 id="showcase-title" className={u.h2}>
            Every step, <b>in one calm app</b>
          </h2>
        </div>

        <div className={sc.stage}>
          {/* the set: emerald studio panel with key light, satin bands, floor and grain */}
          <div className={sc.panel} aria-hidden="true">
            <span className={sc.key} />
            <span className={sc.bands} data-bands="" />
            <span className={sc.grain} />
          </div>

          <div className={sc.tilt}>
            <div ref={wheelRef} className={sc.wheel}>
              {SLOTS.map((s, k) => (
                <div key={k} className={sc.slot} style={{ "--k": k - START } as CSSProperties}>
                  <HdPhone src={s.src} alt={k < SCREENS.length ? s.alt : ""} className={sc.phone} />
                </div>
              ))}
            </div>
          </div>

          <span className={sc.floor} aria-hidden="true" />

          <ul className={cn(sc.labels, sc.labelsL)} aria-hidden="true">
            {LABELS_L.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <ul className={cn(sc.labels, sc.labelsR)} aria-hidden="true">
            {LABELS_R.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
