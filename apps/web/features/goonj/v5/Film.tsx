"use client";

import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

import { BrandLogo } from "../components/BrandLogo";
import { GOONJ } from "../content";
import u from "../v4/ui.module.css";
import f from "./film.module.css";
import { VOICE } from "./voice";

/*
 * The Goonj film. Aarya, Goonj's AI mentor, tells the story in her own voice
 * (the film from goonj.com) and her frame stays clean. Beside her, a story
 * panel turns each line into a visual chapter, and the chapter index below
 * shows how each part of Goonj helps.
 */
const VIDEO = "/goonj/film/aarya-film.mp4";
const POSTER = "/goonj/film/aarya-poster.jpg";

type ChapterId = "real" | "understands" | "practice" | "grows" | "progress";

const CHAPTERS: { id: ChapterId; title: string; line: string }[] = [
  { id: "real", title: "Made for real life", line: "Built around the moments you actually face at work." },
  { id: "understands", title: "Understands you", line: "Knows where you are and where you want to go." },
  { id: "practice", title: "Practise before the moment", line: "Rehearse the hard conversation before it happens." },
  { id: "grows", title: "Remembers & grows with you", line: "Every session builds on the last one." },
  { id: "progress", title: "Progress you can apply", line: "Handle the real moment, on your own." },
];

type Beat = "intro" | "m1" | "m2" | "m3" | "m4" | "gap" | "goonj" | "understand" | "practice" | "grow" | "apply" | "ready" | "cta";

/* `at` is when Aarya starts the line, in seconds, measured from the pauses in her audio. */
export const LINES: { at: number; text: string; beat: Beat; chapters?: ChapterId[] }[] = [
  { at: 0, text: "Work does not come with a script.", beat: "intro" },
  { at: 2.4, text: "One day, you're dealing with a difficult conversation.", beat: "m1", chapters: ["real"] },
  { at: 5.7, text: "The next day, you're expected to speak up in a meeting,", beat: "m2", chapters: ["real"] },
  { at: 8.85, text: "push back a deadline,", beat: "m3", chapters: ["real"] },
  { at: 10.2, text: "or step into a leadership responsibility you have never had before.", beat: "m4", chapters: ["real"] },
  { at: 14.6, text: "You might know what to do, but when it comes to work, knowing is not always the same as doing.", beat: "gap" },
  { at: 21.0, text: "That is where Goonj comes in.", beat: "goonj" },
  { at: 23.1, text: "It understands where you are, where you want to go, and what you need next.", beat: "understand", chapters: ["understands"] },
  { at: 28.0, text: "Goonj gives you a space to practice, reflect and become more valuable at work.", beat: "practice", chapters: ["practice"] },
  { at: 33.2, text: "And as you grow, Goonj grows with you,", beat: "grow", chapters: ["grows"] },
  {
    at: 36.1,
    text: "because real progress happens when you can handle the situations that matter at work even without Goonj.",
    beat: "apply",
    chapters: ["progress"],
  },
  { at: 42.7, text: "Are you ready to practice the moments that matter?", beat: "ready" },
  { at: 45.4, text: "Click on the link and take your first step towards experiencing Goonj.", beat: "cta" },
];
const FALLBACK_TOTAL = 49.4;

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const indexAt = (t: number) => {
  let k = 0;
  LINES.forEach((l, i) => {
    if (t >= l.at) k = i;
  });
  return k;
};

/* ---------- small custom marks for the player (no icon set) ---------- */
const Glyph = {
  play: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 4.2v11.6a.8.8 0 0 0 1.2.7l9.3-5.8a.8.8 0 0 0 0-1.4L7.2 3.5A.8.8 0 0 0 6 4.2Z" fill="currentColor" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="5" y="4" width="3.4" height="12" rx="1.2" fill="currentColor" />
      <rect x="11.6" y="4" width="3.4" height="12" rx="1.2" fill="currentColor" />
    </svg>
  ),
  replay: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5.6 2.8v3.6h3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  soundOn: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 8v4h3l4 3.5v-11L6 8H3Z" fill="currentColor" />
      <path d="M13 7.2a4 4 0 0 1 0 5.6M15.2 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  signal: (
    <svg viewBox="0 0 18 12" aria-hidden="true">
      <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
      <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
      <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
    </svg>
  ),
  wifi: (
    <svg viewBox="0 0 16 12" aria-hidden="true">
      <path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0L8 11.5Z" fill="currentColor" />
      <path d="M3.4 6.8a6.5 6.5 0 0 1 9.2 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M1 4.3a10 10 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  battery: (
    <svg viewBox="0 0 27 12" aria-hidden="true">
      <rect x="0.6" y="0.6" width="22.8" height="10.8" rx="3.2" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
      <rect x="2.2" y="2.2" width="17" height="7.6" rx="2" fill="currentColor" />
      <path d="M25 4v4a2 2 0 0 0 0-4Z" fill="currentColor" fillOpacity="0.45" />
    </svg>
  ),
  soundOff: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 8v4h3l4 3.5v-11L6 8H3Z" fill="currentColor" />
      <path d="m13 8 4 4m0-4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

/* ---------- the story panel: one textured chapter card per line ---------- */
function Card({ tone, children, className }: { tone: "ember" | "dusk" | "sky" | "ink"; children: ReactNode; className?: string }) {
  return (
    <div className={cn(f.card, f[tone], className)}>
      <span className={f.grain} aria-hidden="true" />
      {children}
    </div>
  );
}

function Kicker({ n, children }: { n?: string; children: ReactNode }) {
  return (
    <span className={f.kickerRow}>
      {n && <b>{n}</b>}
      {children}
    </span>
  );
}

const MOMENTS: Record<"m1" | "m2" | "m3" | "m4", { photo: string; pos: string; title: string }> = {
  m1: { photo: "/goonj/story-call.jpg", pos: "50% 30%", title: "A difficult conversation." },
  m2: { photo: "/goonj/presenting.jpg", pos: "75% 30%", title: "Speaking up in the meeting." },
  m3: { photo: "/goonj/phone-call.jpg", pos: "60% 30%", title: "Pushing back a deadline." },
  m4: { photo: "/goonj/one-on-one.jpg", pos: "60% 40%", title: "Leading for the first time." },
};

function Story({ beat }: { beat: Beat }) {
  switch (beat) {
    case "intro":
      return (
        <Card tone="ink">
          <Kicker>The film · with Aarya</Kicker>
          <p className={f.display}>
            Work doesn&apos;t come
            <br />
            with a script.
          </p>
          <span className={f.cardFoot}>49 seconds · Hindi + English mentor</span>
        </Card>
      );
    case "m1":
    case "m2":
    case "m3":
    case "m4": {
      const m = MOMENTS[beat];
      const order = ["m1", "m2", "m3", "m4"].indexOf(beat);
      return (
        <Card tone="ember" className={f.photoCard}>
          <span className={f.duotone}>
            <Image src={m.photo} alt="" fill sizes="(max-width: 1023px) 100vw, 60vw" style={{ objectFit: "cover", objectPosition: m.pos }} />
          </span>
          <span className={f.photoFade} />
          <Kicker n="01">Made for real life</Kicker>
          <p className={f.display}>{m.title}</p>
          <span className={f.ticks} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} data-on={i <= order || undefined} />
            ))}
          </span>
        </Card>
      );
    }
    case "gap":
      return (
        <Card tone="ember" className={f.gapCard}>
          <Kicker>The gap</Kicker>
          <p className={f.gapType}>
            <span>Knowing</span>
            <em>is not</em>
            <span>Doing</span>
          </p>
        </Card>
      );
    case "goonj":
      return (
        <Card tone="ember" className={f.brandCard}>
          <BrandLogo tone="white" className={f.brandLogo} />
          <span className={f.brandSub}>An AI mentor for the human skills of work</span>
        </Card>
      );
    case "understand":
      return (
        <Card tone="dusk">
          <Kicker n="02">Understands you</Kicker>
          <ol className={f.map}>
            {[
              ["Where you are", "Team lead, two years in"],
              ["Where you want to go", "Lead a bigger team by March"],
              ["What you need next", "Giving feedback that lands"],
            ].map(([k, v], i) => (
              <li key={k} style={{ "--i": i } as CSSProperties}>
                <small>{k}</small>
                {v}
              </li>
            ))}
          </ol>
        </Card>
      );
    case "practice":
      return (
        <Card tone="dusk" className={f.splitCard}>
          <div>
            <Kicker n="03">Practise before the moment</Kicker>
            <p className={f.display}>A space to practise, reflect and grow.</p>
          </div>
          <div className={f.phone}>
            <div className={f.phoneScreen}>
              <span className={f.phoneTop}>
                <BrandLogo tone="white" className={f.phoneLogo} />
                <span>Session 3</span>
              </span>
              <span className={f.phoneTitle}>Owning a mistake, calmly</span>
              <span className={f.phoneWave} aria-hidden="true">
                {Array.from({ length: 22 }, (_, i) => (
                  <i key={i} style={{ animationDelay: `${(i % 7) * -0.13}s` }} />
                ))}
              </span>
              <span className={f.phoneSteps}>
                <span>Practise</span>
                <span data-on>Reflect</span>
                <span>Grow</span>
              </span>
            </div>
          </div>
        </Card>
      );
    case "grow":
      return (
        <Card tone="sky" className={f.growCard}>
          <Kicker n="04">Remembers &amp; grows with you</Kicker>
          <svg viewBox="0 0 600 220" className={f.curve} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="filmCurve" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className={f.curveArea} d="M0 200 C90 192 140 170 210 150 S330 110 390 84 S520 30 600 16 L600 220 L0 220 Z" fill="url(#filmCurve)" />
            <path className={f.curveLine} d="M0 200 C90 192 140 170 210 150 S330 110 390 84 S520 30 600 16" />
          </svg>
          <span className={f.markers}>
            {["Week 1 · Clear asks", "Week 3 · Calm under pressure", "Week 6 · Leading the 1:1"].map((t, i) => (
              <span key={t} style={{ "--i": i } as CSSProperties}>
                {t}
              </span>
            ))}
          </span>
        </Card>
      );
    case "apply":
      return (
        <Card tone="sky" className={f.photoCard}>
          <span className={cn(f.duotone, f.duotoneSky)}>
            <Image src="/goonj/story-review.jpg" alt="" fill sizes="(max-width: 1023px) 100vw, 60vw" style={{ objectFit: "cover", objectPosition: "62% 35%" }} />
          </span>
          <span className={f.photoFade} />
          <Kicker n="05">Progress you can apply</Kicker>
          <p className={f.display}>Handled it. On your own.</p>
        </Card>
      );
    case "ready":
    case "cta":
      return (
        <Card tone="ember" className={f.brandCard}>
          <BrandLogo tone="white" className={f.brandLogoSm} />
          <p className={f.ctaTitle}>Ready to practise the moments that matter?</p>
          <a href={GOONJ.cta} className={f.ctaBtn}>
            Get early access <span aria-hidden="true">→</span>
          </a>
        </Card>
      );
  }
}

/* ---------- the voice stepper: Aarya's real waveform, with each step wired to the moment she reaches it ---------- */
const BAR = 4;
const WAVE_W = VOICE.length * BAR;

const Bars = memo(function Bars() {
  return (
    <>
      {VOICE.map((v, i) => {
        const h = Math.max(3, (v / 100) * 56);
        return <rect key={i} x={i * BAR + 0.7} y={(60 - h) / 2} width={BAR - 1.4} height={h} rx={1.3} />;
      })}
    </>
  );
});

type StepState = "next" | "on" | "done";

// One milestone colour: the page's sky blue.
const MILESTONE = Array(5).fill("#a6c3e9") as string[];

function VoiceSteps({
  time,
  total,
  started,
  ended,
  onSeek,
  spans,
}: {
  time: number;
  total: number;
  started: boolean;
  ended: boolean;
  onSeek: (lineIndex: number) => void;
  spans: { first: number; a: number; b: number }[];
}) {
  const progress = started ? Math.min(1, time / total) : 0;
  const state = (k: number): StepState => {
    const { a, b } = spans[k];
    if (ended || (started && time >= b)) return "done";
    if (started && time >= a) return "on";
    return "next";
  };
  const col = (k: number) => (k + 0.5) / CHAPTERS.length;
  const list = useRef<HTMLOListElement>(null);
  const activeStep = CHAPTERS.findIndex((_, k) => state(k) === "on");

  // On phones the steps are a swipe row: keep the step she's on in view.
  useEffect(() => {
    const ol = list.current;
    if (!ol || activeStep < 0 || ol.scrollWidth <= ol.clientWidth) return;
    const li = ol.children[activeStep] as HTMLElement | undefined;
    if (li) ol.scrollTo({ left: li.offsetLeft - ol.offsetLeft - 8, behavior: "smooth" });
  }, [activeStep]);

  return (
    <div className={f.voice}>
      <span className={f.voiceGrain} aria-hidden="true" />
      <div className={f.voiceHead}>
        <span className={f.voiceLabel}>
          <i className={f.liveDot} data-on={(started && !ended) || undefined} />
          Aarya&apos;s voice
        </span>
        <span className={f.voiceTime}>
          {fmt(time)} / {fmt(total)}
        </span>
      </div>

      <div className={f.waveWrap}>
        <svg viewBox={`0 0 ${WAVE_W} 60`} preserveAspectRatio="none" className={f.wave} aria-hidden="true">
          <defs>
            <linearGradient id="voiceLit" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#6f9ad3" />
              <stop offset="0.55" stopColor="#a6c3e9" />
              <stop offset="1" stopColor="#eef4ff" />
            </linearGradient>
            <clipPath id="voiceDone">
              <rect x="0" y="0" width={progress * WAVE_W} height="60" />
            </clipPath>
          </defs>
          <g className={f.waveDim}>
            <Bars />
          </g>
          <g clipPath="url(#voiceDone)" fill="url(#voiceLit)">
            <Bars />
          </g>
        </svg>
        <span className={f.playhead} style={{ left: `${progress * 100}%` }} aria-hidden="true" />
        {spans.map((s, k) => (
          <button
            key={CHAPTERS[k].id}
            type="button"
            className={f.node}
            data-state={state(k)}
            style={{ left: `${(s.a / total) * 100}%`, "--c": MILESTONE[k] } as CSSProperties}
            onClick={() => onSeek(s.first)}
            aria-label={`Play step ${k + 1}: ${CHAPTERS[k].title}`}
          />
        ))}
      </div>

      {/* traces: from the moment on the waveform down to its step */}
      <svg viewBox="0 0 1000 48" preserveAspectRatio="none" className={f.traces} aria-hidden="true">
        {spans.map((s, k) => {
          const x1 = (s.a / total) * 1000;
          const x2 = col(k) * 1000;
          const st = state(k);
          // circuit route: down, across, down, with rounded elbows
          const r = Math.min(10, Math.abs(x2 - x1) / 2);
          const dir = x2 >= x1 ? 1 : -1;
          const d =
            r < 1
              ? `M${x1} 0 V48`
              : `M${x1} 0 V${18 - r} Q${x1} 18 ${x1 + dir * r} 18 H${x2 - dir * r} Q${x2} 18 ${x2} ${18 + r} V48`;
          return (
            <g key={k} data-state={st} className={f.traceGroup} style={{ "--c": MILESTONE[k] } as CSSProperties}>
              <path d={d} className={f.trace} vectorEffect="non-scaling-stroke" />
              {st === "on" && <path d={d} pathLength={100} className={f.pulse} vectorEffect="non-scaling-stroke" />}
            </g>
          );
        })}
      </svg>

      <ol ref={list} className={f.steps}>
        {CHAPTERS.map((c, k) => {
          const st = state(k);
          return (
            <li key={c.id}>
              <button
                type="button"
                className={f.step}
                data-state={st}
                style={{ "--c": MILESTONE[k] } as CSSProperties}
                onClick={() => onSeek(spans[k].first)}
                aria-current={st === "on" ? "step" : undefined}
              >
                <span className={f.badgeWrap}>
                  <span className={f.stepNo}>
                    {st === "done" ? (
                      <svg viewBox="0 0 12 12" aria-hidden="true">
                        <path d="m2.5 6.2 2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      String(k + 1).padStart(2, "0")
                    )}
                  </span>
                  {st === "done" && (
                    <span className={f.confetti} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </span>
                {/* always rendered so every card keeps the same height */}
                <span className={f.unlocked} aria-hidden={st !== "done"}>
                  Milestone {String(k + 1).padStart(2, "0")} · unlocked
                </span>
                <span className={f.stepTitle}>{c.title}</span>
                <span className={f.stepLine}>{c.line}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- player ---------- */
export function Film() {
  const video = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(FALLBACK_TOTAL);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);

  const idx = indexAt(time);
  const line = LINES[idx];
  const lineEnd = LINES[idx + 1]?.at ?? total;

  /* the video is the clock */
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let raf = 0;
    const tick = () => {
      setTime(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      setEnded(false);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(raf);
      setTime(v.currentTime);
    };
    const onEnded = () => {
      setEnded(true);
      onPause();
    };
    const onMeta = () => Number.isFinite(v.duration) && setTotal(v.duration);
    const onSeeked = () => setTime(v.currentTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("seeked", onSeeked);
    if (v.readyState >= 1) onMeta();
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("seeked", onSeeked);
    };
  }, []);

  /* start silently with subtitles once the film is in view; pause when it leaves */
  useEffect(() => {
    const el = wrap.current;
    const v = video.current;
    if (!el || !v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio > 0.5) {
          if (!reduce && !startedRef.current) {
            startedRef.current = true;
            setStarted(true);
            v.play().catch(() => {});
          }
        } else if (!e.isIntersecting) {
          v.pause();
        }
      },
      { threshold: [0, 0.5] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const begin = () => {
    startedRef.current = true;
    setStarted(true);
  };

  const seek = useCallback((k: number) => {
    const v = video.current;
    if (!v) return;
    startedRef.current = true;
    setStarted(true);
    v.currentTime = LINES[k].at;
    v.play().catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    begin();
    if (v.paused || v.ended) {
      if (v.ended) v.currentTime = 0;
      v.play().catch(() => {});
    } else v.pause();
  }, []);

  const toggleSound = () => {
    const v = video.current;
    if (!v) return;
    const next = !sound;
    v.muted = !next;
    setSound(next);
    begin();
    if (next) {
      v.currentTime = LINES[indexAt(v.currentTime)].at;
      v.play().catch(() => {});
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") seek(Math.min(idx + 1, LINES.length - 1));
    else if (e.key === "ArrowLeft") seek(Math.max(idx - 1, 0));
    else if (e.key === "m") toggleSound();
  };

  /* chapter progress: how far through the lines that belong to each chapter */
  const chapterSpan = (id: ChapterId) => {
    const ks = LINES.map((l, k) => (l.chapters?.includes(id) ? k : -1)).filter((k) => k >= 0);
    const a = LINES[ks[0]].at;
    const b = LINES[ks[ks.length - 1] + 1]?.at ?? total;
    return { first: ks[0], a, b };
  };

  const words = line.text.split(" ");
  const lineDur = Math.max(1, lineEnd - line.at);
  const beat: Beat = ended ? "cta" : line.beat;

  return (
    <section id="demo" className={cn(u.section, f.wrap)}>
      <div className={u.container}>
        <div className={u.head}>
          <span className={u.kicker}>Watch the film</span>
          <h2 className={u.h2}>
            Human skills, <b>built through conversation</b>
          </h2>
        </div>

        <div className={f.layout}>
          {/* Aarya, inside the Goonj app on an iPhone */}
          <div ref={wrap} className={f.device} tabIndex={0} role="region" aria-label="Goonj film, presented by Aarya in the Goonj app" onKeyDown={onKey}>
            <span className={cn(f.hw, f.hwAction)} aria-hidden="true" />
            <span className={cn(f.hw, f.hwVolUp)} aria-hidden="true" />
            <span className={cn(f.hw, f.hwVolDown)} aria-hidden="true" />
            <span className={cn(f.hw, f.hwPower)} aria-hidden="true" />
            <div className={f.bezel}>
              <div className={f.stage}>
                <video ref={video} className={f.video} src={VIDEO} poster={POSTER} muted playsInline preload="metadata" aria-hidden="true" />
                <span className={f.vignette} aria-hidden="true" />

                {/* iOS status bar */}
                <div className={f.statusBar} aria-hidden="true">
                  <span className={f.clock}>9:41</span>
                  <span className={f.island}>
                    <i />
                  </span>
                  <span className={f.sysIcons}>
                    {Glyph.signal}
                    {Glyph.wifi}
                    {Glyph.battery}
                  </span>
                </div>

                {/* Goonj app bar */}
                <div className={f.appBar}>
                  <span className={f.appWho}>
                    <span className={f.appLive}>
                      <i /> Live
                    </span>
                    <span>
                      <b>Aarya</b>
                      <small>Your Goonj mentor</small>
                    </span>
                  </span>
                  <button type="button" className={f.sound} onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Mute Aarya" : "Hear Aarya"}>
                    {sound ? Glyph.soundOn : Glyph.soundOff}
                    {!sound && started && <span>Sound</span>}
                  </button>
                </div>

                {!started && (
                  <button type="button" className={f.poster} onClick={toggle}>
                    <span className={f.posterPlay}>{Glyph.play}</span>
                    Hear it from Aarya · 49 sec
                  </button>
                )}

                {started && !ended && (
                  <p className={f.caption} aria-live="polite">
                    <span key={idx} data-paused={!playing || undefined}>
                      {words.map((w, i) => (
                        <span key={i} style={{ animationDelay: `${(i / words.length) * lineDur * 0.85}s` }}>
                          {w}{" "}
                        </span>
                      ))}
                    </span>
                  </p>
                )}

                <div className={f.controls}>
                  <button type="button" className={f.ctrl} onClick={toggle} aria-label={ended ? "Replay" : playing ? "Pause" : "Play"}>
                    {ended ? Glyph.replay : playing ? Glyph.pause : Glyph.play}
                  </button>
                  <div className={f.segments}>
                    {LINES.map((l, k) => {
                      const end = LINES[k + 1]?.at ?? total;
                      const p = ended || time >= end ? 1 : time <= l.at ? 0 : (time - l.at) / (end - l.at);
                      return (
                        <button key={k} type="button" className={f.seg} onClick={() => seek(k)} aria-label={`Jump to: ${l.text}`} style={{ flexGrow: end - l.at }}>
                          <i style={{ transform: `scaleX(${p})` }} />
                        </button>
                      );
                    })}
                  </div>
                  <span className={f.time}>
                    {fmt(time)} / {fmt(total)}
                  </span>
                </div>

                <span className={f.homeBar} aria-hidden="true" />
                <span className={f.glare} aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* the story, told visually beside her */}
          <div className={f.side}>
            <div className={f.storyStage} aria-live="polite">
              <div key={beat} className={f.storySlot} data-paused={!playing || undefined}>
                <Story beat={beat} />
              </div>
            </div>

            <VoiceSteps time={time} total={total} started={started} ended={ended} onSeek={seek} spans={CHAPTERS.map((ch) => chapterSpan(ch.id))} />
          </div>
        </div>

        <p className={f.quote} data-reveal>
          The real measure of progress is not how well you talk to Goonj. It is how well you handle the moments that matter{" "}
          <b>without Goonj.</b>
        </p>
      </div>
    </section>
  );
}
