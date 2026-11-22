"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import s from "../campaign.module.css";

/**
 * Quiet reveals for [data-reveal] blocks, and the phone-only sticky
 * "Get early access" bar: it appears once the hero is scrolled past and
 * hides while the form or the footer is on screen.
 */
export function PageMotion({ cta }: { cta: string }) {
  const [hidden, setHidden] = useState(true);
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = marker.current?.closest<HTMLElement>(`.${s.theme}`);
    if (!root) return;
    root.setAttribute("data-motion", "");
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "");
            reveal.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    root.querySelectorAll("[data-reveal]").forEach((el) => reveal.observe(el));
    // Pick up [data-reveal] blocks that arrive later (client sections that
    // render after this, or live reloads), so nothing is left hidden.
    const late = new MutationObserver((records) => {
      for (const r of records)
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches("[data-reveal]") && !n.hasAttribute("data-in")) reveal.observe(n);
          n.querySelectorAll("[data-reveal]:not([data-in])").forEach((el) => reveal.observe(el));
        });
    });
    late.observe(root, { childList: true, subtree: true });

    const hero = root.querySelector("section");
    const signup = root.querySelector("#signup");
    const footer = root.querySelector("footer");
    const seen = { heroOut: false, formIn: false, footIn: false };
    const update = () => setHidden(!seen.heroOut || seen.formIn || seen.footIn);
    const watch = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) seen.heroOut = !e.isIntersecting;
        if (e.target === signup) seen.formIn = e.isIntersecting;
        if (e.target === footer) seen.footIn = e.isIntersecting;
      }
      update();
    });
    if (hero) watch.observe(hero);
    if (signup) watch.observe(signup);
    if (footer) watch.observe(footer);
    return () => {
      late.disconnect();
      reveal.disconnect();
      watch.disconnect();
    };
  }, []);

  return (
    <>
      <span ref={marker} hidden />
      <div className={s.mobileCta} data-hidden={hidden ? "" : undefined} aria-hidden={hidden}>
        <a href="#signup" className={s.btn} tabIndex={hidden ? -1 : 0}>
          {cta}
          <span className={s.btnArrow} aria-hidden>
            <ArrowUpRight weight="bold" />
          </span>
        </a>
      </div>
    </>
  );
}
