"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { MQ_MOTION } from "@/features/landing/motion";

import { GOONJ } from "../content";
import { HeroShell, useStill } from "../v5/HeroShell";
import { LINES } from "../v5/Film";
import { VOICE } from "../v5/voice";
import { GlassNav } from "./GlassNav";
import { GlossLink, GlossPlay } from "./GlossLink";
import f from "./forest.module.css";

gsap.registerPlugin(ScrollTrigger);

/* the sun breaking between the far peaks: the camera pushes toward it */
const PATH = "50% 54.5%";

/*
 * Goonj means "echo": a misty green valley at dawn, ridge after ridge, with a
 * path climbing toward first light (graded like old film: faded blacks,
 * green shadows, warm light, grain and a heavy vignette). On scroll the hero
 * pins, the camera pushes toward the sun, and the app rises out of the dark in
 * three layers: two phones further back move slowly, and the hand holding
 * the phone with Aarya on screen comes up fastest, in front, where she talks.
 */
const FILM_LENGTH = 49.4;
const BARS = 36;
/* each bar's share of the voice: tallest in the middle, tapering to the ends */
const ENVELOPE = Array.from({ length: BARS }, (_, i) => {
  const x = (i - (BARS - 1) / 2) / ((BARS - 1) / 2);
  return 0.35 + 0.65 * Math.exp(-x * x * 2.2);
});

/* her voice level (0–1) at time t, eased between the measured samples */
function voiceAt(t: number) {
  const p = Math.max(0, Math.min(1, t / FILM_LENGTH)) * (VOICE.length - 1);
  const i = Math.floor(p);
  const a = VOICE[i] ?? 0;
  const b = VOICE[Math.min(VOICE.length - 1, i + 1)] ?? a;
  return (a + (b - a) * (p - i)) / 100;
}
const lineAt = (t: number) => {
  let k = 0;
  LINES.forEach((l, i) => {
    if (t >= l.at) k = i;
  });
  return k;
};

/*
 * Aarya talking on the hand's phone: the film (her own voice) rendered into
 * the screen's perspective, so her lips move while the phone is in view.
 * Under her, a slim waveform follows her voice and a live caption lights up
 * word by word, in the app's own caption style. It plays muted; the pill
 * turns her voice on from the start.
 */
function TalkingScreen() {
  const video = useRef<HTMLVideoElement>(null);
  const ui = useRef<HTMLDivElement>(null);
  const wave = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLParagraphElement>(null);
  const [sound, setSound] = useState(false);
  const [line, setLine] = useState(0);
  const words = LINES[line].text.split(" ");

  // the screen overlay is drawn in the mockup's 1000px space; keep it at the hand's size
  useEffect(() => {
    const el = ui.current;
    const hand = el?.parentElement;
    if (!el || !hand) return;
    const ro = new ResizeObserver(() => el.style.setProperty("--k", String(hand.clientWidth / 1000)));
    ro.observe(hand);
    return () => ro.disconnect();
  }, []);

  // play only while the phone is in view (and motion is allowed: otherwise it stays hidden)
  useEffect(() => {
    const v = video.current;
    const hand = v?.parentElement;
    if (!v || !hand) return;
    const mq = window.matchMedia(MQ_MOTION);
    let seen = false;
    const sync = () => {
      if (seen && mq.matches) v.play().catch(() => {});
      else v.pause();
    };
    const io = new IntersectionObserver(
      ([e]) => {
        seen = e.intersectionRatio > 0.3;
        sync();
      },
      { threshold: [0, 0.3, 0.6] },
    );
    io.observe(hand);
    mq.addEventListener("change", sync);
    return () => {
      io.disconnect();
      mq.removeEventListener("change", sync);
      v.pause();
    };
  }, []);

  // while she plays (heard or not): the waveform follows her voice, the caption follows her words
  useEffect(() => {
    const v = video.current;
    const w = wave.current;
    if (!v || !w) return;
    const bars = Array.from(w.children) as HTMLElement[];
    const h = new Array(BARS).fill(0.08);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let shown = -1;
    const tick = (now: number) => {
      const t = v.currentTime;
      const s = now / 1000;
      const lv = v.paused ? 0 : voiceAt(t);
      for (let i = 0; i < BARS; i++) {
        // a calm shimmer on top of the level, so neighbouring bars never move as one
        const shimmer = 0.55 + 0.45 * Math.sin(s * (5.1 + (i % 5) * 0.9) + i * 1.7);
        const target = 0.08 + (still ? 0 : lv * ENVELOPE[i] * shimmer);
        h[i] += (target - h[i]) * 0.28;
        bars[i].style.transform = `scaleY(${h[i].toFixed(3)})`;
      }
      // the caption: the current line, words lighting up as she says them
      const k = lineAt(t);
      if (k !== shown) {
        shown = k;
        setLine(k);
      }
      const start = LINES[k].at;
      const end = LINES[k + 1]?.at ?? FILM_LENGTH;
      const spans = caption.current ? (Array.from(caption.current.children) as HTMLElement[]) : [];
      const said = Math.ceil(spans.length * Math.min(1, (t - start) / Math.max(0.4, (end - start) * 0.88)));
      spans.forEach((el, i) => el.toggleAttribute("data-said", i < said));
      raf = requestAnimationFrame(tick);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      // let the bars settle, then rest
      cancelAnimationFrame(raf);
      bars.forEach((b) => (b.style.transform = "scaleY(0.08)"));
    };
    v.addEventListener("playing", run);
    v.addEventListener("pause", stop);
    if (!v.paused) run();
    return () => {
      v.removeEventListener("playing", run);
      v.removeEventListener("pause", stop);
      cancelAnimationFrame(raf);
    };
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (sound) {
      v.muted = true;
      setSound(false);
      return;
    }
    v.muted = false;
    v.currentTime = 0;
    v.play().catch(() => {});
    setSound(true);
  };

  return (
    <>
      <video
        ref={video}
        className={f.talk}
        src="/goonj/mockups/aarya-speaking.mp4"
        poster="/goonj/mockups/aarya-speaking.webp"
        muted={!sound}
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
      />
      <div ref={ui} className={f.screenUi}>
        {/* the screen's own caption area, cleared, with her voice and words on it */}
        <div className={f.live} aria-hidden="true">
          <div ref={wave} className={f.wave}>
            {ENVELOPE.map((_, i) => (
              <i key={i} />
            ))}
          </div>
          <p key={line} ref={caption} className={f.caption}>
            {words.map((w, i) => (
              <span key={`${line}-${i}`}>{w} </span>
            ))}
          </p>
        </div>
        <button
          type="button"
          className={f.hear}
          data-on={sound || undefined}
          onClick={toggle}
          aria-pressed={sound}
          aria-label={sound ? "Mute Aarya" : "Hear Aarya speak"}
        >
          {sound ? <SpeakerHigh weight="fill" /> : <SpeakerSlash />}
          <span>{sound ? "Aarya is speaking" : "Tap to hear Aarya"}</span>
        </button>
      </div>
    </>
  );
}

function Forest({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={stageRef} className={f.stage}>
      <div className={f.photo} data-photo aria-hidden="true">
        <Image src="/goonj/valley/valley.webp" alt="" fill priority sizes="100vw" className={f.photoImg} />
      </div>

      {/* rays from the rising sun, and fog drifting along the valley */}
      <span className={f.rays} data-rays aria-hidden="true" />
      <span className={f.mist} aria-hidden="true" />
      <span className={f.mist2} aria-hidden="true" />

      {/* the vintage grade: a warm wash, room for the headline, a heavy vignette */}
      <span className={f.tone} aria-hidden="true" />
      <span className={f.shade} data-shade aria-hidden="true" />
      <span className={f.vignette} aria-hidden="true" />

      {/* the app, in three depths */}
      <span className={f.glow} data-glow aria-hidden="true" />
      <div className={`${f.phone} ${f.left}`} data-phone="left" aria-hidden="true">
        <Image src="/goonj/mockups/tilt-track.webp" alt="" width={682} height={1246} sizes="(max-width: 759px) 40vw, 24vw" />
      </div>
      <div className={`${f.phone} ${f.right}`} data-phone="right" aria-hidden="true">
        <Image src="/goonj/mockups/front-transformation.webp" alt="" width={676} height={1361} sizes="(max-width: 759px) 40vw, 24vw" />
      </div>
      <div className={f.hand} data-hand>
        <Image src="/goonj/mockups/hand-aarya.webp" alt="" width={1000} height={1250} sizes="(max-width: 1023px) 90vw, 50vw" />
        <TalkingScreen />
      </div>

      {/* film grain and dust over everything, phones included */}
      <span className={f.grain} aria-hidden="true" />
      <span className={f.dust} aria-hidden="true" />
    </div>
  );
}

export function ForestHero() {
  const still = useStill();
  const stageRef = useRef<HTMLDivElement>(null);
  const toFilm = () => document.getElementById("demo")?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });

  useEffect(() => {
    const stage = stageRef.current;
    const hero = stage?.closest<HTMLElement>("section");
    const copy = hero?.querySelector<HTMLElement>("[data-hero-copy]");
    if (!stage || !hero || !copy) return;
    const pick = (sel: string) => stage.querySelector<HTMLElement>(sel)!;
    const photo = pick("[data-photo]");
    const rays = pick("[data-rays]");
    const shade = pick("[data-shade]");
    const glow = pick("[data-glow]");
    const left = pick('[data-phone="left"]');
    const right = pick('[data-phone="right"]');
    const hand = pick("[data-hand]");

    const mm = gsap.matchMedia();
    mm.add(MQ_MOTION, () => {
      // the back phones peek out of the dark at the bottom corners; the hand waits below
      gsap.set(photo, { scale: 1.06, transformOrigin: PATH });
      gsap.set(left, { opacity: 1, yPercent: 78, rotation: -14 });
      gsap.set(right, { opacity: 1, yPercent: 86, rotation: 12 });
      gsap.set(hand, { opacity: 1, yPercent: 100, rotation: -10, scale: 0.92 });
      gsap.set(glow, { opacity: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "+=300%",
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      // the camera walks up the path the whole way, the light coming up with it
      tl.to(photo, { scale: 1.34, yPercent: -2, duration: 4 }, 0).to(rays, { opacity: 0.85, duration: 3 }, 0);

      // the words step aside first
      tl.to(copy, { yPercent: -28, autoAlpha: 0, duration: 0.8, ease: "power1.in" }, 0).to(shade, { opacity: 0.35, duration: 1 }, 0);

      // parallax: each layer travels its own distance in the same time, so the
      // far phones drift up slowly and the hand in front comes up fastest
      tl.to(left, { yPercent: -4, rotation: -8, duration: 3.2, ease: "power1.out" }, 0.2)
        .to(right, { yPercent: 2, rotation: 7, duration: 3.2, ease: "power1.out" }, 0.45)
        .to(glow, { opacity: 1, duration: 1.4, ease: "power2.out" }, 1.1)
        .to(hand, { yPercent: 0, rotation: 0, scale: 1, duration: 2.6, ease: "power3.out" }, 1.1)
        // hold the arrival a moment before the page moves on
        .to({}, { duration: 0.6 });
    });
    return () => mm.revert();
  }, []);

  return (
    <HeroShell
      layout="focus"
      tone="dark"
      nav={<GlassNav tone="dark" />}
      cta={
        <GlossLink href={GOONJ.cta}>
          Get early access
          <ArrowRight size={18} weight="bold" />
        </GlossLink>
      }
      ghost={<GlossPlay onClick={toFilm}>Watch the film</GlossPlay>}
      backdrop={<Forest stageRef={stageRef} />}
      ghostLabel="Watch the film"
      onGhost={toFilm}
    />
  );
}
