"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

import { GOONJ } from "../content";
import u from "../v4/ui.module.css";
import a from "./app.module.css";
import { Phone } from "./Phone";

/*
 * Sections built from the Goonj app itself (Figma: "Goonj App | Client").
 * Screens are real exports; copy follows the app's own flow and wording.
 */

/* ---------- 1. the three promises (the app's welcome screens) ---------- */
const PROMISES = [
  {
    src: "/goonj/app/welcome-knows.png",
    title: "Goonj knows you deeply",
    line: "Understands your work and life context, learns how you naturally respond, and keeps your goals in focus.",
  },
  {
    src: "/goonj/app/welcome-adapts.png",
    title: "Goonj adapts to your reality",
    line: "Adjusts to the day you're having, evolves with your changing life, and supports you at your own pace.",
  },
  {
    src: "/goonj/app/welcome-rise.png",
    title: "Goonj helps you rise in real life",
    line: "Prepares you for real situations, turns learning into action, and helps you grow beyond the app.",
  },
];

export function Promises() {
  return (
    <section className={cn(u.section, a.promises)} aria-labelledby="promises-title">
      <div className={u.container}>
        <div className={u.head}>
          <span className={u.kicker}>The Goonj app</span>
          <h2 id="promises-title" className={u.h2}>
            Three promises, <b>one companion</b>
          </h2>
        </div>
        <div className={a.promiseRow}>
          {PROMISES.map((p, i) => (
            <figure key={p.title} className={a.promise} data-i={i} data-reveal>
              <Phone src={p.src} alt={`Goonj app welcome screen: ${p.title}`} className={a.promisePhone} />
              <figcaption>
                <span className={a.promiseNo}>0{i + 1}</span>
                <b>{p.title}</b>
                <span>{p.line}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 2. how it works, step by step through the real app ---------- */
const STEPS = [
  {
    title: "Session 0: Aarya gets to know you",
    line: "A few quick questions about real moments at work, in Hindi or English. No right or wrong answers.",
    src: "/goonj/app/session0.png",
  },
  {
    title: "Tracks picked for you",
    line: "Based on your answers, Aarya suggests tracks like Speaking Confidence or Interview Readiness.",
    src: "/goonj/app/suggested-tracks.png",
  },
  {
    title: "Playbooks, one skill at a time",
    line: "Each track holds playbooks, like Clear Manager Update, personalised to how you work.",
    src: "/goonj/app/playbook.png",
  },
  {
    title: "Sessions with Aarya",
    line: "Short voice or video sessions. Tap an answer or just talk it through.",
    src: "/goonj/app/aarya-talk.png",
  },
  {
    title: "Try it in real life",
    line: "Each session ends with a small real-world activity, like saying one clear sentence to your boss.",
    src: "/goonj/app/session1-complete.png",
  },
];

const STEP_MS = 5200;

export function HowApp() {
  const [k, setK] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setK((x) => (x + 1) % STEPS.length), STEP_MS);
    return () => window.clearTimeout(t);
  }, [k, paused]);

  return (
    <section id="how" className={u.section} aria-labelledby="how-title">
      <div className={u.container}>
        <div className={u.head}>
          <span className={u.kicker}>How it works</span>
          <h2 id="how-title" className={u.h2}>
            From first hello <b>to the real moment</b>
          </h2>
        </div>

        <div className={a.how} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <ol className={a.howSteps}>
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <button type="button" className={a.howStep} data-on={i === k || undefined} onClick={() => setK(i)} aria-current={i === k ? "step" : undefined}>
                  <span className={a.howNo}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={a.howText}>
                    <b>{s.title}</b>
                    <span>{s.line}</span>
                  </span>
                  {i === k && (
                    <span className={a.howBar} aria-hidden="true">
                      <i key={`${k}-${paused}`} data-paused={paused || undefined} style={{ animationDuration: `${STEP_MS}ms` }} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ol>

          <div className={a.howStage}>
            <span className={a.howGlow} aria-hidden="true" />
            <div className={a.howPhones}>
              {STEPS.map((s, i) => (
                <div key={s.src} className={a.howScreen} data-on={i === k || undefined} aria-hidden={i !== k}>
                  <Phone src={s.src} alt={`Goonj app: ${s.title}`} className={a.howPhone} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. tracks and playbooks ---------- */
const TRACKS = [
  { name: "Speaking Confidence", line: "Speak up clearly in meetings and with your manager.", tone: "green" },
  { name: "Interview Readiness", line: "Answer with calm, structured stories.", tone: "slate" },
  { name: "Leadership Basics", line: "Lead your first one-on-ones and team talks.", tone: "blue" },
  { name: "Workplace Etiquette", line: "Handle the unwritten rules of office life.", tone: "teal" },
] as const;

export function Tracks() {
  return (
    <section className={u.section} aria-labelledby="tracks-title">
      <div className={u.container}>
        <div className={a.tracksWrap}>
          <div className={a.tracksCopy}>
            <span className={u.kicker}>Tracks &amp; playbooks</span>
            <h2 id="tracks-title" className={u.h2}>
              Grow in the areas <b>that matter to you</b>
            </h2>
            <p className={u.lede}>A track is an area of growth. Inside it, playbooks take one skill and walk you through it, session by session.</p>

            <div className={a.trackGrid}>
              {TRACKS.map((t) => (
                <div key={t.name} className={cn(a.trackCard, a[t.tone])} data-reveal>
                  <span className={a.trackMark} aria-hidden="true" />
                  <b>{t.name}</b>
                  <span>{t.line}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={a.playbook} data-reveal>
            <span className={a.pbTrack}>Speaking Confidence · playbook</span>
            <b className={a.pbTitle}>Clear Manager Update</b>
            <p className={a.pbLine}>Give clear, confident work updates to your manager, without rambling or scattered status reports.</p>
            <div className={a.pbTabs} aria-hidden="true">
              <span>About</span>
              <span data-on>Personalised</span>
              <span>Journey</span>
            </div>
            <ol className={a.pbJourney}>
              {["Session 0", "Session 1", "Session 2", "Session 3"].map((s, i) => (
                <li key={s} data-state={i < 2 ? "done" : i === 2 ? "on" : "next"}>
                  <i />
                  <span>{s}</span>
                  {i === 1 && <em>The First Echo</em>}
                </li>
              ))}
            </ol>
            <Phone src="/goonj/app/track.png" alt="Goonj app: the Speaking Confidence track" className={a.pbPhone} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 4. progress you can see ---------- */
export function Progress() {
  return (
    <section className={u.section} aria-labelledby="progress-title">
      <div className={u.container}>
        <div className={u.head}>
          <span className={u.kicker}>Your transformation</span>
          <h2 id="progress-title" className={u.h2}>
            Progress <b>you can see</b>
          </h2>
        </div>

        <div className={a.progress}>
          <div className={cn(a.pCard, a.pPhoneCard)} data-reveal>
            <span className={a.pCaption}>
              <b>Transformation</b>
              Your growth, tracks and next steps in one place.
            </span>
            <Phone src="/goonj/app/transformation.png" alt="Goonj app: your Transformation, with progress and tracks" className={a.pPhone} />
          </div>

          <div className={cn(a.pCard, a.pMedal)} data-reveal>
            <Image src="/goonj/app/medal.png" alt="" width={187} height={187} className={a.medal} />
            <b>The First Echo</b>
            <span className={a.achieved}>Achieved</span>
            <p>Milestones unlock as you keep showing up for your sessions.</p>
          </div>

          <div className={cn(a.pCard, a.pStreak)} data-reveal>
            <span className={a.streakNo}>8</span>
            <b>Day streak</b>
            <span className={a.week} aria-hidden="true">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <i key={i} data-on={i < 5 || undefined}>
                  {d}
                </i>
              ))}
            </span>
            <p>Small, steady practice adds up.</p>
          </div>

          <div className={cn(a.pCard, a.pComplete)} data-reveal>
            <span className={a.check} aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="m5 10.4 3.2 3.2L15.4 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <b>Session 1 complete</b>
            <p>&ldquo;You took the time to stay with this. That in itself matters.&rdquo;</p>
            <span className={a.rwa}>Real World Activity</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 5. beyond practice: trends, interests, mood ---------- */
const MOODS = [
  { label: "Very unpleasant", c1: "#ff7a1a", c2: "#8a1f0a" },
  { label: "Unpleasant", c1: "#d24bd6", c2: "#3b2aa8" },
  { label: "Neutral", c1: "#8fb7ff", c2: "#2f5fd0" },
  { label: "Pleasant", c1: "#7ff0d0", c2: "#1d8f8a" },
  { label: "Very pleasant", c1: "#d8f06a", c2: "#1fa070" },
];

export function Everyday() {
  const [m, setM] = useState(3);
  return (
    <section className={u.section} aria-labelledby="everyday-title">
      <div className={u.container}>
        <div className={u.head}>
          <span className={u.kicker}>More than practice</span>
          <h2 id="everyday-title" className={u.h2}>
            A companion <b>for every day at work</b>
          </h2>
        </div>

        <div className={a.everyday}>
          <div className={cn(a.eCard, a.eTrends)} data-reveal>
            <span className={a.eKicker}>Trends</span>
            <b>Let&apos;s see what&apos;s around the world</b>
            <p>Talk through what everyone at work is talking about.</p>
            <span className={a.chips}>
              {["Appraisal cycle", "Union Budget", "Swiggy's IPO"].map((t) => (
                <i key={t}>{t}</i>
              ))}
            </span>
          </div>

          <div className={cn(a.eCard, a.eInterests)} data-reveal>
            <span className={a.eKicker}>Interests</span>
            <b>Share a few things you&apos;d like to talk through with Aarya</b>
            <span className={a.chips}>
              {["Badminton", "Food", "Travel"].map((t) => (
                <i key={t}>{t}</i>
              ))}
            </span>
          </div>

          <div className={cn(a.eCard, a.eMood)} data-reveal>
            <span className={a.eKicker}>Mood check-in</span>
            <b>How do you feel?</b>
            <span
              className={a.orb}
              style={{ "--c1": MOODS[m].c1, "--c2": MOODS[m].c2 } as CSSProperties}
              aria-hidden="true"
            />
            <span className={a.moodLabel}>{MOODS[m].label}</span>
            <input
              type="range"
              min={0}
              max={4}
              step={1}
              value={m}
              onChange={(e) => setM(+e.target.value)}
              className={a.moodRange}
              aria-label="Try the mood check-in"
              aria-valuetext={MOODS[m].label}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. plans ---------- */
const PLANS = [
  {
    name: "Voice + Video",
    line: "A more immersive experience with both voice and visual presence.",
    month: 8,
    year: 60,
    features: ["Voice and video mentor experience", "Saved progress and personalisation", "Session insights and activities", "Access to purchase tracks & playbooks"],
    featured: true,
  },
  {
    name: "Voice Only",
    line: "A voice-first experience for guided conversations, anytime.",
    month: 6,
    year: 50,
    features: ["Real-time voice mentor experience", "Saved progress and personalisation", "Session insights and activities", "Access to purchase tracks & playbooks"],
    featured: false,
  },
];

export function Plans() {
  const [annual, setAnnual] = useState(true);
  return (
    <section id="plans" className={u.section} aria-labelledby="plans-title">
      <div className={u.container}>
        <div className={u.head}>
          <span className={u.kicker}>Pick your plan</span>
          <h2 id="plans-title" className={u.h2}>
            Choose your <b>Goonj experience</b>
          </h2>
          <p className={u.lede}>Start with 15 days free. No commitment, cancel anytime.</p>
          <div className={a.toggle} role="group" aria-label="Billing period">
            <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>
              Monthly
            </button>
            <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>
              Annual
            </button>
          </div>
        </div>

        <div className={a.plans}>
          {PLANS.map((p) => {
            const save = Math.round((1 - p.year / (p.month * 12)) * 100);
            return (
              <article key={p.name} className={a.plan} data-featured={p.featured || undefined} data-reveal>
                {p.featured && <span className={a.planTag}>Most immersive</span>}
                <b className={a.planName}>{p.name}</b>
                <p className={a.planLine}>{p.line}</p>
                <p className={a.price}>
                  <span>${annual ? p.year : p.month}</span>
                  <small>{annual ? "billed annually" : "billed monthly"}</small>
                  {annual && <em>Save {save}%</em>}
                </p>
                <ul className={a.features}>
                  {p.features.map((f) => (
                    <li key={f}>
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" />
                        <path d="m4.6 8.3 2.2 2.2 4.6-4.8" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={GOONJ.cta} className={a.planCta}>
                  Start 15 days free trial
                </a>
              </article>
            );
          })}
        </div>
        <p className={a.planNote}>Free for 15 days, then billed at your selected plan price. Tracks and playbooks can be added anytime.</p>
      </div>
    </section>
  );
}
