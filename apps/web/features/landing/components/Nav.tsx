"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { NAV_LINKS } from "../content";
import shared from "../landing.module.css";
import styles from "./nav.module.css";
import { Logo } from "./Logo";
import { Magnetic } from "./Magnetic";

/**
 * Fixed nav. Light over a dark or photographic hero; frosted white with dark
 * ink over light heroes and once the page scrolls past; tucks away while
 * reading down.
 */
export function Nav() {
  const [onPhoto, setOnPhoto] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        // Heroes on a light surface mark themselves data-nav="ink".
        const hero = document.getElementById("top");
        const light = hero?.dataset.nav === "ink";
        setOnPhoto(hero ? !light && y < hero.offsetHeight - 88 : y < 24);
        setScrolled(y > 24);
        // Only hide well past the hero, and reveal on any upward scroll.
        if (Math.abs(y - last) > 6) setHidden(y > last && y > window.innerHeight * 0.9);
        last = y;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={styles.header}
      data-on-photo={onPhoto}
      data-scrolled={scrolled}
      data-hidden={hidden}
    >
      <div className={styles.bar}>
        <Logo tone={onPhoto ? "light" : "dark"} />
        <nav className={styles.links} aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.actions}>
          <Link className={styles.login} href="/login">
            Log in
          </Link>
          <Magnetic strength={0.25}>
            <Link className={cn(shared.btn, shared.btnPrimary, shared.btnSm)} href="/register">
              Get started
              <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
            </Link>
          </Magnetic>
        </div>
      </div>
    </header>
  );
}
