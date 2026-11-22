"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

import u from "../v4/ui.module.css";
import { HeroShell } from "./HeroShell";
import s from "./story.module.css";

/*
 * The hero tells one real-world story in three beats, taken straight from
 * Goonj's own promise: focus on your needs, practise in small steps, apply
 * right away. One person, one working day.
 */
const BEATS = [
  {
    time: "11:20 AM",
    step: "Focus on your needs",
    title: "A client call goes sideways.",
    photo: "/goonj/story-call.jpg",
    focus: "50% 38%",
  },
  {
    time: "1:30 PM",
    step: "Practice in small steps",
    title: "Six minutes with Abhimanyu.",
    photo: "/goonj/story-desk.jpg",
    focus: "70% 40%",
  },
  {
    time: "4:00 PM",
    step: "Apply right away",
    title: "The review goes well.",
    photo: "/goonj/story-review.jpg",
    focus: "62% 40%",
  },
] as const;

const BEAT_MS = 6000;

function Sticker({ src, className, size = 96 }: { src: string; className?: string; size?: number }) {
  return <Image src={src} alt="" width={size} height={size} className={cn(s.sticker, className)} aria-hidden="true" />;
}


/* ---------- what appears on top of each beat ---------- */
function BeatOne() {
  return (
    <>
      <Sticker src="/goonj/3d/grimace.png" className={s.stGrimace} size={128} />
      <div className={s.notice}>
        <span className={s.noticeIcon}>
          <Image src="/goonj/goonj-mark-white.png" alt="" width={1060} height={640} sizes="40px" className={s.noticeMark} />
        </span>
        <span className={s.noticeBody}>
          <span className={s.noticeHead}>
            <b>Goonj</b>
            <span>now</span>
          </span>
          Rough call? Let&apos;s prepare for your 4 pm review.
        </span>
      </div>
    </>
  );
}

function BeatTwo() {
  return (
    <>
      <div className={s.phone}>
        <div className={s.screen}>
          <Image src="/goonj/abhimanyu.jpg" alt="" fill sizes="240px" style={{ objectFit: "cover", objectPosition: "50% 20%" }} />
          <span className={s.screenScrim} />
          <span className={s.island} />
          <span className={s.live}>
            <i /> Live · Abhimanyu
          </span>
          <div className={s.wave} aria-hidden="true">
            {Array.from({ length: 22 }, (_, k) => (
              <i key={k} style={{ animationDelay: `${(k % 7) * -0.13}s` }} />
            ))}
          </div>
        </div>
      </div>
      <div className={s.bubble}>&ldquo;Start with what you own. Then the fix.&rdquo;</div>
      <Sticker src="/goonj/3d/mic.png" className={s.stMic} size={128} />
    </>
  );
}

function BeatThree() {
  return (
    <>
      <Sticker src="/goonj/3d/sparkles.png" className={s.stSpark} size={112} />
      <Sticker src="/goonj/3d/thumbs-up.png" className={s.stThumb} size={128} />
      <div className={s.toast}>
        <Image src="/goonj/3d/trophy.png" alt="" width={56} height={56} className={s.toastIcon} />
        <span>
          <small>Marker earned</small>
          Calm under pressure
        </span>
      </div>
    </>
  );
}

const OVERLAYS = [BeatOne, BeatTwo, BeatThree];

export function StoryHero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const [run, setRun] = useState(0); // restarts the progress animation
  const storyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setStill(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (paused || still) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % BEATS.length), BEAT_MS);
    return () => window.clearTimeout(t);
  }, [active, paused, still, run]);

  const go = (k: number) => {
    setActive(k);
    setRun((r) => r + 1);
  };

  const replay = () => {
    go(0);
    setPaused(false);
    storyRef.current?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
  };

  return (
    <HeroShell ghostLabel="Watch Rohan's day" onGhost={replay}>
      <div
        ref={storyRef}
        className={s.story}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        aria-roledescription="story"
        aria-label="One working day with Goonj"
      >
        {BEATS.map((b, k) => {
          const on = k === active;
          const Overlay = OVERLAYS[k];
          return (
            <article key={b.step} className={s.beat} data-on={on || undefined} data-beat={k + 1}>
              <div className={s.frame}>
                <Image
                  src={b.photo}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  loading="eager"
                  className={s.photo}
                  style={{ objectPosition: b.focus }}
                />
                <span className={s.scrim} aria-hidden="true" />

                <span className={s.time}>
                  <b>0{k + 1}</b> {b.time}
                </span>

                <div className={s.overlay} aria-hidden={!on}>
                  {on && <Overlay />}
                </div>

                <div className={s.caption}>
                  <span className={s.step}>{b.step}</span>
                  <p className={s.beatTitle}>{b.title}</p>
                  <span className={s.progress} aria-hidden="true">
                    {on && (
                      <i
                        key={`${active}-${run}`}
                        data-paused={paused || still || undefined}
                        style={{ animationDuration: `${BEAT_MS}ms` }}
                      />
                    )}
                  </span>
                </div>

                {!on && (
                  <button type="button" className={s.hit} onClick={() => go(k)}>
                    <span className={u.srOnly}>
                      Show {b.time}: {b.step}
                    </span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </HeroShell>
  );
}
