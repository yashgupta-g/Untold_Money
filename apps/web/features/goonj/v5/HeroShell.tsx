"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, Play } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

import { BrandLogo } from "../components/BrandLogo";
import { VersionSwitch } from "../components/VersionSwitch";
import { GOONJ } from "../content";
import s from "./story.module.css";

const AVATARS = ["/goonj/3d/woman-1.png", "/goonj/3d/man-2.png", "/goonj/3d/woman-2.png", "/goonj/3d/man-1.png"];

const MQ_STILL = "(prefers-reduced-motion: reduce)";

function subscribeStill(cb: () => void) {
  const mq = window.matchMedia(MQ_STILL);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True when the visitor asked for reduced motion. */
export function useStill() {
  return useSyncExternalStore(
    subscribeStill,
    () => window.matchMedia(MQ_STILL).matches,
    () => false,
  );
}

/**
 * The hero frame every Goonj v5 hero shares: the sky stage, the white pill
 * nav, the headline and the two calls to action. Each hero passes its own
 * showpiece as `children` and its own label for the ghost button.
 * `layout="focus"` is a text-only hero with very little text, centred on the
 * stage: a two-part badge, a thin headline with two bold key words, one
 * supporting line, the CTAs.
 * `backdrop` replaces the sky with the hero's own background, and
 * `tone="dark"` flips the nav and copy to light-on-dark to sit on it.
 * `nav` replaces the built-in white nav bar (it keeps a spacer in its place).
 * `cta` replaces the main call to action (e.g. the glossy GlossLink), and
 * `ghost` replaces the secondary one (e.g. GlossPlay).
 */
export function HeroShell({
  ghostLabel,
  onGhost,
  layout = "centre",
  backdrop,
  tone = "light",
  nav,
  cta,
  ghost,
  children,
}: {
  ghostLabel: string;
  onGhost: () => void;
  layout?: "centre" | "focus";
  backdrop?: ReactNode;
  tone?: "light" | "dark";
  nav?: ReactNode;
  cta?: ReactNode;
  ghost?: ReactNode;
  children?: ReactNode;
}) {
  const focus = layout === "focus";
  const dark = tone === "dark";
  const foot = <p className={s.foot}>Start free. Leave anytime. Always private.</p>;

  const copy = (
    <div className={cn(s.copy, focus && s.copyFocus)} data-hero-copy>
      {focus ? (
        // two-part pill: faces in a white chip, the news in colour
        <a href={GOONJ.cta} className={s.badge}>
          <span className={s.badgeChip}>
            <span className={s.trustFaces} aria-hidden="true">
              {AVATARS.slice(0, 3).map((a) => (
                <span key={a}>
                  <Image src={a} alt="" width={30} height={30} />
                </span>
              ))}
            </span>
            Limited release
          </span>
          <span className={s.badgeNews}>
            <Image src="/goonj/3d/sparkles.png" alt="" width={48} height={48} className={s.badgeSpark} aria-hidden="true" />
            Now open
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </span>
        </a>
      ) : (
        <p className={s.trust}>
          <span className={s.trustFaces} aria-hidden="true">
            {AVATARS.map((a) => (
              <span key={a}>
                <Image src={a} alt="" width={30} height={30} />
              </span>
            ))}
          </span>
          Limited release · now open
        </p>
      )}

      <h1 className={s.title}>
        {focus ? (
          <>
            <span>
              Become More <b>Valuable</b>
            </span>
            <span>
              At Work with <b>Goonj</b>
            </span>
          </>
        ) : (
          <>
            <span>
              Become More Valuable
              <Image src="/goonj/3d/sparkles.png" alt="" width={96} height={96} className={s.inline} aria-hidden="true" />
            </span>
            <span>At Work with Goonj</span>
          </>
        )}
      </h1>

      <p className={s.sub}>
        Build the human skills you need to handle the conversations, decisions, and leadership situations that impact your career.
      </p>

      <div className={s.ctas}>
        {cta ?? (
          <a href={GOONJ.cta} className={s.ctaInk}>
            Get early access
            <ArrowRight size={18} weight="bold" />
          </a>
        )}
        {ghost ?? (
          <button type="button" className={s.ctaGhost} onClick={onGhost}>
            <span className={s.playDot}>
              <Play size={12} weight="fill" />
            </span>
            {ghostLabel}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <section id="top" className={s.hero}>
      <div className={cn(s.stage, dark && s.stageDark)}>
        {backdrop ?? (
          <>
            <Image src="/goonj/sky.jpg" alt="" fill priority sizes="100vw" className={s.sky} />
            <span className={s.veil} aria-hidden="true" />
          </>
        )}

        {nav ? (
          <>
            {nav}
            <div className={s.navSpace} aria-hidden="true" />
          </>
        ) : (
          <header className={s.nav}>
            <div className={s.navStart}>
              <a href="#top" className={s.brand} aria-label="Goonj home">
                <BrandLogo tone={dark ? "white" : "black"} className={s.logo} priority />
              </a>
              <VersionSwitch />
            </div>
            <nav aria-label="Sections" className={s.links}>
              <a href="#top" aria-current="page">
                Home
              </a>
              <a href="#how">How it works</a>
              <a href="#mentors">Mentors</a>
              <a href="#plans">Plans</a>
              <a href="#stories">Stories</a>
              <a href="#faq">FAQ</a>
            </nav>
            <div className={s.navEnd}>
              <a href={GOONJ.cta} className={s.navCta}>
                Get early access
              </a>
            </div>
          </header>
        )}

        {focus ? (
          <div className={s.focus}>
            {copy}
            {children}
          </div>
        ) : (
          <>
            {copy}
            {children}
            {foot}
          </>
        )}
      </div>
    </section>
  );
}
