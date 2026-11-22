"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Image from "next/image";
import { ArrowCounterClockwise, Pause, Play } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

import d from "./demo.module.css";
import u from "./ui.module.css";

/* A scripted preview cut standing in for the product film. */
const SCENES = [
  { chapter: "Session 0", title: "Goonj gets to know you", photo: "/goonj/laptop-phone.jpg", focus: "60% 30%", dur: 7 },
  { chapter: "Pick a moment", title: "Choose what's coming up this week", photo: "/goonj/meeting.jpg", focus: "40% 40%", dur: 7 },
  { chapter: "Rehearse", title: "Practise it out loud with Aarya", photo: "/goonj/aarya-call.jpg", focus: "50% 25%", dur: 9 },
  { chapter: "Progress", title: "See your growth score rise", photo: "/goonj/desk-laptop.jpg", focus: "55% 40%", dur: 7 },
  { chapter: "Apply", title: "Then try it in the real meeting", photo: "/goonj/one-on-one.jpg", focus: "50% 50%", dur: 8 },
];
const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);
const STARTS = SCENES.reduce<number[]>((a, s, i) => (a.push(i ? a[i - 1] + SCENES[i - 1].dur : 0), a), []);
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function Demo() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const last = useRef(0);
  const ended = time >= TOTAL;
  let idx = 0;
  STARTS.forEach((s, i) => {
    if (time >= s) idx = i;
  });
  const scene = SCENES[idx];

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    last.current = performance.now();
    const loop = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setTime((t) => {
        const n = Math.min(TOTAL, t + dt);
        if (n >= TOTAL) setPlaying(false);
        return n;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const toggle = useCallback(() => {
    setStarted(true);
    if (ended) {
      setTime(0);
      setPlaying(true);
    } else setPlaying((p) => !p);
  }, [ended]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") setTime((t) => Math.min(TOTAL - 0.01, t + 5));
    else if (e.key === "ArrowLeft") setTime((t) => Math.max(0, t - 5));
  };

  return (
    <section id="demo" className={u.section}>
      <div className={u.container}>
        <div className={u.head}>
          <span className={u.kicker}>Product demo</span>
          <h2 className={u.h2}>
            See Goonj in <b>{TOTAL} seconds</b>
          </h2>
        </div>

        <div
          className={d.player}
          data-playing={playing || undefined}
          data-started={started || undefined}
          tabIndex={0}
          onKeyDown={onKey}
          aria-label="Goonj product demo, preview cut. Space to play or pause."
          data-reveal
        >
          {SCENES.map((s, i) => (
            <div key={s.chapter} className={d.shot} data-on={i === idx || undefined} aria-hidden={i !== idx}>
              <Image src={s.photo} alt="" fill sizes="(max-width: 1280px) 100vw, 1280px" style={{ objectFit: "cover", objectPosition: s.focus }} />
            </div>
          ))}
          <div className={d.scrim} />

          {started && (
            <div key={idx} className={cn(u.glass, d.caption)}>
              <span>
                {String(idx + 1).padStart(2, "0")} · {scene.chapter}
              </span>
              <strong>{scene.title}</strong>
            </div>
          )}

          {!playing && (
            <button type="button" className={d.poster} onClick={toggle} aria-label={ended ? "Replay demo" : "Play demo"}>
              <span className={cn(u.glass, d.play)}>
                {ended ? <ArrowCounterClockwise size={30} /> : <Play size={30} weight="fill" />}
              </span>
              {!started && <span className={d.posterNote}>Preview cut · the full film is coming soon</span>}
            </button>
          )}

          <div className={cn(u.glass, d.bar)}>
            <button type="button" className={d.ctl} onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
            </button>
            <span className={d.time}>
              {fmt(time)} / {fmt(TOTAL)}
            </span>
            <div className={d.track}>
              {SCENES.map((s, i) => {
                const fill = i < idx ? 1 : i === idx ? (time - STARTS[i]) / s.dur : 0;
                return (
                  <button
                    key={s.chapter}
                    type="button"
                    className={d.seg}
                    style={{ flex: s.dur } as CSSProperties}
                    onClick={() => {
                      setStarted(true);
                      setTime(STARTS[i] + 0.01);
                    }}
                    aria-label={`Jump to ${s.chapter}`}
                  >
                    <i style={{ transform: `scaleX(${Math.min(1, Math.max(0, fill))})` }} />
                    <em>{s.chapter}</em>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
