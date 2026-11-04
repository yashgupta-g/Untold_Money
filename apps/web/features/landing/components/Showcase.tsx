"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";

import { SHOWCASE } from "../content";
import shared from "../landing.module.css";
import { MQ_REDUCE } from "../motion";
import styles from "./showcase.module.css";

/**
 * Product loop. Plays muted only while on screen; never autoplays under
 * reduced motion; always offers a pause control (WCAG 2.2.2).
 */
export function Showcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || window.matchMedia(MQ_REDUCE).matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      video.play().catch(() => {});
    } else {
      userPaused.current = true;
      video.pause();
    }
  };

  return (
    <section className={shared.section} aria-labelledby="showcase-title">
      <div className={shared.container}>
        <div className={`${shared.sectionHead} ${shared.sectionHeadCenter}`} data-reveal>
          <span className={shared.eyebrow}>Inside the journal</span>
          <h2 id="showcase-title" className={shared.h2}>
            Your trading, measured
          </h2>
          <p className={shared.lede}>
            Win rate, profit factor, expectancy and drawdown, recalculated as you log each trade.
          </p>
        </div>

        <div className={styles.frame} data-reveal>
          <video
            ref={videoRef}
            className={styles.video}
            src={SHOWCASE.src}
            poster={SHOWCASE.poster}
            width={SHOWCASE.width}
            height={SHOWCASE.height}
            muted
            loop
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            aria-label="The UntoldMoney journal performance dashboard with sample data: win rate, profit factor, equity curve and a trade calendar"
          />
          <button
            type="button"
            className={styles.control}
            onClick={toggle}
            aria-label={playing ? "Pause video" : "Play video"}
          >
            {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
          </button>
        </div>
      </div>
    </section>
  );
}
