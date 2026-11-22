"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

import u from "../v4/ui.module.css";
import st from "./appStatement.module.css";

/*
 * The statement, told the way the app begins: Aarya asks one gentle
 * question in Session 0 and shapes what comes next around the answer.
 * Question and options are the app's own (Session 0 · Clear Manager Update).
 */
const OPTIONS = [
  { label: "I ramble", reply: "Then we'll practise leading with the one thing your manager needs to hear first." },
  { label: "I sound unsure", reply: "That's common. Let's find a steady opening line you can say with confidence." },
  { label: "I say too much", reply: "We'll practise trimming an update down to three clear points." },
  { label: "I freeze at the start", reply: "Let's give you a first sentence you can always fall back on." },
] as const;

const FACTS = ["Aarya & Abhimanyu", "Voice or video", "Hindi + English", "Always private"];

const STEPS = [
  {
    n: "01",
    title: "Focus on your needs",
    text: "Session 0 learns your work, your goals and where you tend to get stuck.",
    link: { label: "See how it works", href: "#how" },
  },
  {
    n: "02",
    title: "Practise in small steps",
    text: "Short sessions with Aarya or Abhimanyu, by voice or video, in Hindi or English.",
    link: { label: "Meet the mentors", href: "#mentors" },
  },
  {
    n: "03",
    title: "Apply right away",
    text: "Each session ends with a real-world activity for your next working day.",
    link: { label: "Choose a plan", href: "#plans" },
  },
] as const;

/**
 * `look="poster"` (the new-hero pages) sets it like a premium poster in the
 * app's own theme (charcoal, emerald light, texture), with the live Session 0
 * screen set into a photo-real phone (mockup2.png).
 */
export function AppStatement({ look = "app" }: { look?: "app" | "poster" }) {
  const [picked, setPicked] = useState(1);
  const reply = OPTIONS[picked].reply;
  const poster = look === "poster";

  // the phone's screen is laid out at the mockup's own 1200-px scale; --k fits it to the box
  const mockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mockRef.current;
    if (!el) return;
    const fit = () => el.style.setProperty("--k", String(el.clientWidth / 1200));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [poster]);

  const session = (
    <figure className={st.session} data-reveal={poster ? undefined : true}>
      <header className={st.sHead}>
        <span className={st.sClose} aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </span>
        <span className={st.sTitle}>
          <b>Session 0</b>
          Clear Manager Update
        </span>
        <span className={st.sLive}>
          <i aria-hidden="true" /> Aarya is listening
        </span>
      </header>

      <div className={st.face}>
        <Image src="/goonj/app/aarya-face.png" alt="Aarya, your Goonj mentor" fill sizes="160px" />
      </div>

      <p className={st.question} id="s0-q">
        What usually happens when you try to update your manager?
      </p>

      <div className={st.options} role="radiogroup" aria-labelledby="s0-q">
        {OPTIONS.map((o, k) => (
          <button key={o.label} type="button" role="radio" aria-checked={picked === k} className={st.option} onClick={() => setPicked(k)}>
            {o.label}
          </button>
        ))}
      </div>

      <div className={st.reply} aria-live="polite">
        <span className={st.replyWho}>Aarya</span>
        <span key={picked} className={st.replyBody}>
          <span className={st.dots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className={st.replyText}>{reply}</span>
        </span>
      </div>

      <footer className={st.sBar} aria-hidden="true">
        <span className={st.sRound}>
          <svg viewBox="0 0 20 20">
            <rect x="3" y="5" width="14" height="10" rx="2" />
            <path d="M6 9h1M9 9h1M12 9h1M14 9h0M7 12h6" />
          </svg>
        </span>
        <span className={st.sNext}>
          <svg viewBox="0 0 20 20">
            <path d="M4 10h12M11 5l5 5-5 5" />
          </svg>
        </span>
        <span className={st.sRound}>
          <svg viewBox="0 0 20 20">
            <rect x="7.5" y="3" width="5" height="9" rx="2.5" />
            <path d="M5 10a5 5 0 0 0 10 0M10 15v2" />
          </svg>
        </span>
      </footer>
      <figcaption className={u.srOnly}>An example of Session 0 in the Goonj app. Pick an answer to see how Aarya responds.</figcaption>
    </figure>
  );

  return (
    <section className={cn(u.section, st.wrap, poster && st.poster)} aria-labelledby="statement">
      {poster && (
        <>
          {/* black + orange smoke, slowly drifting, under heavy film grain */}
          <span className={st.smoke} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className={st.grain} aria-hidden="true" />
        </>
      )}
      <div className={cn(u.container, st.grid)}>
        <div className={st.copy}>
          <span className={u.kicker}>Goonj, in one line</span>
          <p id="statement" className={st.big} data-reveal>
            Goonj helps working professionals master <b>the moments that matter</b>, and grow at work.
          </p>
          <p className={st.lede} data-reveal>
            It starts the way the app does. Aarya asks about your work, listens to how you answer, and shapes every session around you.
          </p>
          <ul className={st.facts} data-reveal>
            {FACTS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        {/* Session 0, as it looks in the app */}
        {poster ? (
          <div className={st.stage} data-reveal>
            <div ref={mockRef} className={st.mock}>
              <div className={st.screen}>
                <span className={st.status} aria-hidden="true">
                  <b>9:41</b>
                  <span className={st.statusIcons}>
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
                {session}
              </div>
              <Image src="/goonj/mockups/tilt-frame.webp" alt="" width={1200} height={1311} sizes="560px" className={st.frame} />
            </div>
            <span className={st.floor} aria-hidden="true" />
          </div>
        ) : (
          session
        )}
      </div>

      {poster ? (
        /* the three steps as glowing cards: dark at the top, the app's emerald rising from below */
        <ol className={cn(u.container, st.cards)}>
          {STEPS.map(({ n, title, text, link }) => (
            <li key={n} className={st.card} data-reveal>
              <b>{title}</b>
              <span className={st.cardText}>{text}</span>
              <a href={link.href} className={st.cardLink}>
                {link.label} <ArrowRight size={15} weight="bold" />
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <ol className={cn(u.container, st.steps)}>
          {STEPS.map((s) => (
            <li key={s.n} data-reveal>
              <span className={st.stepN}>{s.n}</span>
              <b>{s.title}</b>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
