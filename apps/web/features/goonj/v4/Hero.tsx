"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, CaretLeft, CaretRight, DotsThree, Fire, VideoCamera, Waveform } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

import { BrandLogo } from "../components/BrandLogo";
import { VersionSwitch } from "../components/VersionSwitch";
import { GOONJ } from "../content";
import h from "./hero.module.css";
import u from "./ui.module.css";

/* ---------- scenes: each arrow press changes mentor and moment ---------- */
const SCENES = [
  {
    photo: "/goonj/aarya-call.jpg",
    mentor: "Aarya",
    moment: "Critical Feedback",
    line: "Rehearse your reply before the review, so the real one feels familiar.",
    thumbs: ["/goonj/meeting.jpg", "/goonj/one-on-one.jpg", "/goonj/phone-call.jpg"],
    focus: "50% 20%",
  },
  {
    photo: "/goonj/abhimanyu.jpg",
    mentor: "Abhimanyu",
    moment: "Your First 1:1",
    line: "Lead the conversation you've been avoiding, with a plan for the first ten minutes.",
    thumbs: ["/goonj/colleagues.jpg", "/goonj/desk-laptop.jpg", "/goonj/meeting.jpg"],
    focus: "50% 25%",
  },
  {
    photo: "/goonj/laptop-phone.jpg",
    mentor: "Aarya",
    moment: "The Promotion Talk",
    line: "Practise asking for what you've earned, calmly and without over-explaining.",
    thumbs: ["/goonj/presenting.jpg", "/goonj/portrait-meera.jpg", "/goonj/one-on-one.jpg"],
    focus: "70% 30%",
  },
] as const;

const AVATARS = ["/goonj/portrait-meera.jpg", "/goonj/portrait-arjun.jpg", "/goonj/one-on-one.jpg", "/goonj/desk-laptop.jpg"];

function Ring({ value, color, track, size = 96, stroke = 7 }: { value: number; color: string; track: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={h.ring} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/** Segmented ring, like the reference's health score: four arcs with gaps. */
function ScoreRing() {
  const segs = [
    { a0: -80, a1: 0, c: "var(--coral)" },
    { a0: 12, a1: 80, c: "var(--blue-ui)" },
    { a0: 92, a1: 170, c: "var(--blue-ui)" },
    { a0: 182, a1: 262, c: "var(--coral)" },
  ];
  const R = 40;
  const p = (a: number) => {
    const t = (a * Math.PI) / 180;
    return `${(50 + Math.cos(t) * R).toFixed(1)} ${(50 + Math.sin(t) * R).toFixed(1)}`;
  };
  return (
    <svg viewBox="0 0 100 100" className={h.score} aria-hidden="true">
      {segs.map((s, i) => (
        <path key={i} d={`M${p(s.a0)} A${R} ${R} 0 0 1 ${p(s.a1)}`} fill="none" stroke={s.c} strokeWidth="9" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const scene = SCENES[i];
  const go = (d: number) => setI((v) => (v + d + SCENES.length) % SCENES.length);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setI((v) => (v + 1) % SCENES.length), 7000);
    return () => clearTimeout(id);
  }, [i, paused]);

  return (
    <section id="top" className={h.wrap} data-reveal-skip>
      <div className={h.stage} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {/* The scene photo, tinted into the sky behind the phone. */}
        <div className={h.bgPhotos} aria-hidden="true">
          {SCENES.map((s, k) => (
            <div key={s.photo} className={h.bgPhoto} data-on={k === i || undefined}>
              <Image src={s.photo} alt="" fill sizes="70vw" priority={k === 0} loading={k === 0 ? undefined : "eager"} style={{ objectFit: "cover", objectPosition: s.focus }} />
            </div>
          ))}
        </div>
        <div className={h.sheen} aria-hidden="true" />

        <header className={h.nav}>
          <div className={h.navStart}>
            <a href="#top" className={h.brand} aria-label="Goonj home">
              <BrandLogo tone="white" className={h.brandLogo} priority />
            </a>
            <VersionSwitch />
          </div>
          <nav aria-label="Sections" className={cn(u.glass, h.links)}>
            <a href="#how">How it works</a>
            <a href="#mentors">Mentors</a>
            <a href="#demo">Demo</a>
            <a href="#stories">Stories</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a href={GOONJ.cta} className={cn(u.btn, u.btnWhite, h.navCta)}>
            Get early access
          </a>
        </header>

        <h1 className={h.title}>
          <span>
            Where <b>AI</b> Meets
          </span>
          <span>
            <b>Human</b> Potential
          </span>
        </h1>

        <button type="button" className={cn(h.arrow, h.arrowL)} onClick={() => go(-1)} aria-label="Previous scene">
          <CaretLeft size={22} />
        </button>
        <button type="button" className={cn(h.arrow, h.arrowR)} onClick={() => go(1)} aria-label="Next scene">
          <CaretRight size={22} />
        </button>

        {/* left: the invitation */}
        <div className={h.left}>
          <p className={h.leftTitle}>Limited Release</p>
          <p className={h.leftSub}>Early access is open</p>
          <div className={h.people}>
            <div className={cn(u.glass, h.stack)}>
              {AVATARS.map((a) => (
                <span key={a} className={h.avatar}>
                  <Image src={a} alt="" fill sizes="44px" style={{ objectFit: "cover" }} />
                </span>
              ))}
              <span className={cn(h.avatar, h.avatarMore)}>+</span>
            </div>
            <span className={h.peopleText}>
              Professionals
              <br />
              already in
            </span>
          </div>
          <p className={h.leftBody}>
            An AI mentor that helps you rehearse the conversations that shape your career, in Hindi or English.
          </p>
          <a href={GOONJ.cta} className={cn(u.btn, u.btnWhite)}>
            Get early access <ArrowRight size={16} />
          </a>
        </div>

        {/* centre: the phone */}
        <div className={h.phoneWrap}>
          <div className={h.phone} role="img" aria-label={`Goonj app: a live video session with ${scene.mentor}`}>
            <div className={h.screen}>
              {SCENES.map((s, k) => (
                <div key={s.photo} className={h.screenPhoto} data-on={k === i || undefined} aria-hidden="true">
                  <Image src={s.photo} alt="" fill sizes="340px" loading="eager" style={{ objectFit: "cover", objectPosition: s.focus }} />
                </div>
              ))}
              <div className={h.screenScrim} />
              <div className={h.status} aria-hidden="true">
                <span>9:41</span>
                <span className={h.island} />
                <span className={h.statusIcons}>
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className={h.live}>
                <span className={h.liveDot} /> Live with {scene.mentor}
              </div>

              <div className={h.today}>
                <div className={h.todayHead}>
                  <strong>Today&apos;s Session</strong>
                  <DotsThree size={22} weight="bold" />
                </div>
                <div className={h.widgets}>
                  <div className={cn(h.widget, h.widgetWarm)}>
                    <span className={h.wLabel}>
                      Pace <Waveform size={14} />
                    </span>
                    <div className={h.ringBox}>
                      <Ring value={0.72} color="var(--on-sky)" track="rgba(255,255,255,0.18)" />
                      <span className={h.ringValue}>
                        <strong>138</strong>
                        <span>wpm</span>
                      </span>
                    </div>
                  </div>
                  <div className={cn(h.widget, h.widgetWhite)}>
                    <div className={h.ringBox}>
                      <ScoreRing />
                      <span className={h.scoreValue}>
                        <strong>8.4</strong>
                        <span>Growth score</span>
                      </span>
                    </div>
                  </div>
                  <div className={cn(h.widget, h.widgetWarm)}>
                    <span className={h.wLabel}>Composure</span>
                    <svg viewBox="0 0 120 34" className={h.wave} aria-hidden="true">
                      <path d="M0 22 C12 22 14 8 24 14 S38 30 48 18 S62 4 72 16 S88 28 98 14 S112 10 120 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className={cn(h.widget, h.widgetWarm)}>
                    <span className={h.wLabel}>
                      Streak <Fire size={14} />
                    </span>
                    <strong className={h.wBig}>6 days</strong>
                    <span className={h.wSmall}>keep going</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* right: the moment being practised */}
        <div className={h.right}>
          <article className={cn(u.glass, h.momentCard)}>
            <div className={h.momentTop}>
              <div className={h.dots} role="tablist" aria-label="Scenes">
                {SCENES.map((s, k) => (
                  <button
                    key={s.moment}
                    type="button"
                    role="tab"
                    aria-selected={k === i}
                    aria-label={s.moment}
                    className={h.dot}
                    onClick={() => setI(k)}
                  />
                ))}
              </div>
              <a href="#moments" className={h.more}>
                More
              </a>
            </div>
            <div key={scene.moment} className={h.thumbs}>
              {scene.thumbs.map((t, k) => (
                <span key={t + k} className={h.thumb}>
                  <Image src={t} alt="" fill sizes="200px" loading="eager" style={{ objectFit: "cover" }} />
                </span>
              ))}
            </div>
            <h2 key={`t${scene.moment}`} className={h.momentTitle}>
              {scene.moment}
            </h2>
            <p key={`l${scene.moment}`} className={h.momentLine}>
              {scene.line}
            </p>
          </article>
          <div className={h.minis}>
            <div className={h.miniPhoto}>
              <Image src="/goonj/phone-call.jpg" alt="" fill sizes="220px" style={{ objectFit: "cover" }} />
              <span className={h.miniText}>
                Hindi
                <br />+ English
              </span>
            </div>
            <div className={cn(u.glass, h.miniGlass)}>
              <span className={h.miniIcons}>
                <Waveform size={18} />
                <VideoCamera size={18} />
              </span>
              <strong>Voice or video</strong>
              <span>Switch anytime</span>
            </div>
          </div>
        </div>

        <p className={h.foot}>Made in India · Private by design</p>
      </div>
    </section>
  );
}

/* ---------- floating nav after the hero ---------- */
export function FloatingNav() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("top");
    const on = () => setShown(!!hero && hero.getBoundingClientRect().bottom < 90);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={h.float} data-shown={shown || undefined} aria-hidden={!shown} inert={!shown}>
      <a href="#top" className={h.floatBrand} tabIndex={shown ? 0 : -1} aria-label="Goonj home">
        <BrandLogo className={h.floatLogo} />
      </a>
      <VersionSwitch />
      <nav aria-label="Sections" className={h.floatLinks}>
        {[
          ["How it works", "#how"],
          ["Mentors", "#mentors"],
          ["Demo", "#demo"],
          ["Stories", "#stories"],
          ["FAQ", "#faq"],
        ].map(([l, href]) => (
          <a key={href} href={href} tabIndex={shown ? 0 : -1}>
            {l}
          </a>
        ))}
      </nav>
      <a href={GOONJ.cta} className={cn(u.btn, u.btnInk, h.floatCta)} tabIndex={shown ? 0 : -1}>
        Get early access
      </a>
    </header>
  );
}
