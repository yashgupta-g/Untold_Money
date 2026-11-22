import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  Eye,
  LockSimple,
  Microphone,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  VideoCamera,
  Waveform,
} from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

import { BrandLogo } from "../components/BrandLogo";
import { GOONJ } from "../content";
import s from "./sections.module.css";
import u from "./ui.module.css";

/* ---------- why: a photo bento, one line per tile ---------- */
export function Why() {
  return (
    <section id="why" className={u.section}>
      <div className={u.container}>
        <div className={u.head}>
          <span className={u.kicker}>Why Goonj</span>
          <h2 className={u.h2}>
            The <b>human skills</b> that move careers
          </h2>
        </div>

        <div className={s.bento}>
          <article className={cn(s.tile, s.tA)} data-reveal>
            <Image src="/goonj/meeting.jpg" alt="Colleagues in a meeting" fill sizes="(max-width: 900px) 100vw, 50vw" className={s.img} />
            <div className={s.caption}>
              <strong>Practise before the moment</strong>
              <span>Rehearse the real conversation, out loud.</span>
            </div>
          </article>

          <article className={cn(s.tile, s.tB, s.white)} data-reveal>
            <div className={s.toggle} aria-hidden="true">
              <span>Hindi</span>
              <span className={s.toggleOn}>English</span>
            </div>
            <div className={s.bubbles} aria-hidden="true">
              <p className={s.bubbleThem}>Kal ki meeting ke liye ready?</p>
              <p className={s.bubbleYou}>Almost. Let&apos;s practise once.</p>
            </div>
            <div className={s.tileText}>
              <strong>Talks like you</strong>
              <span>Switch languages mid-sentence.</span>
            </div>
          </article>

          <article className={cn(s.tile, s.tC)} data-reveal>
            <Image src="/goonj/phone-call.jpg" alt="Professional on a call at her desk" fill sizes="(max-width: 900px) 100vw, 25vw" className={s.img} />
            <div className={s.caption}>
              <strong>Remembers you</strong>
              <span>Never start from scratch.</span>
            </div>
          </article>

          <article className={cn(s.tile, s.tD, s.sky)} data-reveal>
            <div className={s.chartHead}>
              <span>Growth score</span>
              <strong>
                8.4 <em>+2.1</em>
              </strong>
            </div>
            <svg viewBox="0 0 400 120" className={s.chart} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="v4area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
                  <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 100 C40 96 60 84 100 80 S170 70 200 58 S280 44 320 30 S380 18 400 14 V120 H0Z" fill="url(#v4area)" />
              <path d="M0 100 C40 96 60 84 100 80 S170 70 200 58 S280 44 320 30 S380 18 400 14" fill="none" stroke="#fff" strokeWidth="3" />
              <circle cx="400" cy="14" r="6" fill="var(--coral)" stroke="#fff" strokeWidth="3" />
            </svg>
            <div className={s.tileText}>
              <strong>Progress you can see</strong>
              <span>Markers show what&apos;s changing.</span>
            </div>
          </article>

          <article className={cn(s.tile, s.tE)} data-reveal>
            <Image src="/goonj/desk-laptop.jpg" alt="Professional at his desk" fill sizes="(max-width: 900px) 100vw, 25vw" className={s.img} />
            <div className={s.caption}>
              <strong>Ten minutes a day</strong>
              <span>Sized for a working week.</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ---------- how: four steps, each with a small app widget ---------- */
const STEPS = [
  { n: "01", title: "Share your goal", line: "Session 0 learns your role and what you want to change." },
  { n: "02", title: "Rehearse the moment", line: "Practise by voice or video with your mentor." },
  { n: "03", title: "See what changed", line: "Markers capture the behaviours you're building." },
  { n: "04", title: "Try it at work", line: "One small action, then Goonj asks how it went." },
];

function StepWidget({ i }: { i: number }) {
  if (i === 0)
    return (
      <div className={s.wChat} aria-hidden="true">
        <p className={s.wMentor}>What would you like to get better at?</p>
        <p className={s.wYou}>Giving feedback to my team.</p>
      </div>
    );
  if (i === 1)
    return (
      <div className={s.wVoice} aria-hidden="true">
        <span className={s.wWave}>
          {[10, 18, 28, 16, 34, 22, 30, 14, 24, 12, 20, 8].map((h, k) => (
            <i key={k} style={{ height: h, animationDelay: `${k * 0.08}s` }} />
          ))}
        </span>
        <span className={s.wMic}>
          <Microphone size={22} weight="fill" />
        </span>
      </div>
    );
  if (i === 2)
    return (
      <div className={s.wRing} aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--sky-4)" strokeWidth="9" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--coral)" strokeWidth="9" strokeLinecap="round" strokeDasharray="196 252" transform="rotate(-90 50 50)" />
        </svg>
        <span>
          <strong>78%</strong>
          <em>Composure</em>
        </span>
      </div>
    );
  return (
    <div className={s.wTask} aria-hidden="true">
      <CheckCircle size={26} weight="fill" />
      <div>
        <strong>Ask one question first</strong>
        <span>Thursday · 1:1</span>
      </div>
    </div>
  );
}

export function How() {
  return (
    <section id="how" className={u.section}>
      <div className={u.container}>
        <div className={u.head}>
          <span className={u.kicker}>How it works</span>
          <h2 className={u.h2}>
            Four steps to <b>real change</b>
          </h2>
        </div>
        <ol className={s.steps}>
          {STEPS.map((st, i) => (
            <li key={st.n} className={s.step} data-reveal>
              <div className={s.stepArt}>
                <StepWidget i={i} />
              </div>
              <span className={s.stepNum}>{st.n}</span>
              <h3 className={u.title}>{st.title}</h3>
              <p>{st.line}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- mentors ---------- */
/* the AI mentors as they appear in the app (Figma), cut out and set in a dark studio */
const MENTORS = [
  { name: "Aarya", role: "Confidence & communication", photo: "/goonj/mentors/aarya.webp", w: 896, h: 1112, tone: "warm" },
  { name: "Abhimanyu", role: "Leadership & decisions", photo: "/goonj/mentors/abhimanyu.webp", w: 613, h: 983, tone: "cool" },
] as const;

export function Mentors() {
  return (
    <section id="mentors" className={u.section}>
      <div className={u.container}>
        <div className={u.head}>
          <span className={u.kicker}>Your mentors</span>
          <h2 className={u.h2}>
            Two mentors who <b>remember you</b>
          </h2>
        </div>
        <div className={s.mentors}>
          {MENTORS.map((m) => (
            <article key={m.name} className={s.mentor} data-tone={m.tone} data-reveal>
              <Image src={m.photo} alt={`${m.name}, Goonj AI mentor`} width={m.w} height={m.h} sizes="(max-width: 900px) 80vw, 40vw" className={s.headshot} />
              <div className={cn(u.glass, s.plate)}>
                <div>
                  <strong>{m.name}</strong>
                  <span>{m.role}</span>
                </div>
                <span className={s.modes}>
                  <Waveform size={18} />
                  <VideoCamera size={18} />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- stories (sample) ---------- */
const QUOTES = [
  { q: "My voice didn't shake once in my appraisal.", name: "Ananya R.", role: "Product manager", photo: "/goonj/portrait-meera.jpg" },
  { q: "I finally had the conversation I was avoiding.", name: "Vikram S.", role: "Engineering lead", photo: "/goonj/portrait-arjun.jpg" },
  { q: "It switches to Hindi when I do. So natural.", name: "Mehak K.", role: "Analyst", photo: "/goonj/one-on-one.jpg" },
];

export function Stories() {
  return (
    <section id="stories" className={u.section}>
      <div className={u.container}>
        <div className={s.storiesStage}>
          <div className={u.head}>
            <span className={cn(u.kicker, s.kickerGlass)}>Early members · sample stories</span>
            <h2 className={cn(u.h2, s.onSky)}>
              Real people, <b>real moments</b>
            </h2>
          </div>
          <div className={s.quotes}>
            {QUOTES.map((x) => (
              <figure key={x.name} className={cn(u.glass, s.quote)} data-reveal>
                <blockquote>“{x.q}”</blockquote>
                <figcaption>
                  <span className={s.qAvatar}>
                    <Image src={x.photo} alt="" fill sizes="44px" style={{ objectFit: "cover" }} />
                  </span>
                  <span>
                    <strong>{x.name}</strong>
                    {x.role}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- trust ---------- */
const TRUST = [
  { Icon: LockSimple, t: "Private by design" },
  { Icon: ShieldCheck, t: "Secure by default" },
  { Icon: Eye, t: "Clear about your data" },
  { Icon: SlidersHorizontal, t: "Always in your control" },
];

export function Trust() {
  return (
    <section id="trust" className={s.trustWrap}>
      <div className={u.container}>
        <div className={s.trust} data-reveal>
          <p className={s.trustLead}>
            <Sparkle size={18} weight="fill" /> A safe space to practise
          </p>
          <ul className={s.trustList}>
            {TRUST.map(({ Icon, t }) => (
              <li key={t}>
                <span className={s.trustIcon}>
                  <Icon size={20} />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <a href={GOONJ.privacy} className={s.trustLink}>
            Privacy policy <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
const FAQ = [
  ["What is Goonj?", "An AI mentor that helps working professionals practise feedback, leadership and tough conversations."],
  ["Is it a course or a chatbot?", "Neither. You rehearse real situations with a mentor who remembers your journey."],
  ["Hindi or English?", "Both. Switch whenever you like, even mid-sentence."],
  ["Is my data private?", "Yes. Privacy is at the core of how Goonj is built."],
  ["How do I start?", "Request early access. If selected, you begin with Session 0."],
];

export function Faq() {
  return (
    <section id="faq" className={u.section}>
      <div className={cn(u.container, s.faq)}>
        <div className={s.faqHead}>
          <span className={u.kicker}>FAQ</span>
          <h2 className={u.h2}>
            Questions, <b>answered</b>
          </h2>
          <a href={GOONJ.faq} className={cn(u.btn, u.btnWhite, s.faqAll)}>
            All FAQs <ArrowUpRight size={16} />
          </a>
        </div>
        <div className={s.faqList}>
          {FAQ.map(([q, a], i) => (
            <details key={q} className={s.faqItem} open={i === 0}>
              <summary>
                {q}
                <span className={s.faqPlus}>
                  <Plus size={16} />
                </span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- final CTA + footer ---------- */
export function Final() {
  return (
    <section className={s.finalWrap}>
      <div className={s.final}>
        <div className={s.finalPhoto} aria-hidden="true">
          <Image src="/goonj/presenting.jpg" alt="" fill sizes="60vw" style={{ objectFit: "cover" }} />
        </div>
        <div className={s.finalCopy}>
          <h2 className={s.finalTitle}>
            <span>
              Whatever comes <b>next</b>,
            </span>
            <span>
              Goonj is <b>with you</b>
            </span>
          </h2>
          <p>Join the limited release and start with Session 0.</p>
          <a href={GOONJ.cta} className={cn(u.btn, u.btnWhite)}>
            Get early access <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={cn(u.container, s.footRow)}>
        <BrandLogo className={s.footLogo} />
        <nav aria-label="Footer" className={s.footLinks}>
          <a href={GOONJ.privacy}>Privacy</a>
          <a href={GOONJ.terms}>Terms</a>
          <a href={GOONJ.faq}>FAQ</a>
          <a href={GOONJ.contact}>Contact</a>
          <a href={GOONJ.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </nav>
        <span className={s.footNote}>Made in India · Lucknow · © 2026</span>
      </div>
      <p className={cn(u.container, s.credits)}>Photography: RDNE Stock, Yan Krukov, Kampus and other Pexels contributors; Ratul Puri, Captian Jayu, Skytech Aviation (Unsplash). 3D emoji: Microsoft Fluent Emoji (MIT).</p>
    </footer>
  );
}
