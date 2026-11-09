import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";

import { cn } from "@/lib/utils";
import { Logo } from "@/features/landing/components/Logo";
import { MEDIA } from "@/features/landing/content";
import shared from "@/features/landing/landing.module.css";
import tokens from "@/features/landing/tokens.module.css";
import styles from "../auth.module.css";

// Same type as the landing page: SF Pro Display where the visitor has it,
// Inter everywhere else (see tokens.module.css).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

/**
 * Split layout for the auth pages: the form on the white page, and an inset
 * photo panel like the landing hero.
 */
export function AuthShell({
  aside,
  children,
}: {
  /** Top-right prompt, e.g. a link to the other auth page. */
  aside: { prompt: string; href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className={cn(inter.variable, tokens.theme, shared.page, styles.shell)}>
      <div className={styles.main}>
        <header className={styles.top}>
          <Logo />
          <p className={styles.aside}>
            <span>{aside.prompt}</span>
            <Link href={aside.href}>{aside.label}</Link>
          </p>
        </header>

        <main className={styles.body}>{children}</main>

        <footer className={styles.foot}>
          &copy; {new Date().getFullYear()} UntoldMoney. Not investment advice.
        </footer>
      </div>

      <aside className={styles.panel} aria-label="UntoldMoney">
        <Image
          src={MEDIA.ridge.src}
          alt=""
          fill
          preload
          sizes="(min-width: 1024px) 52vw, 0px"
          className={styles.photo}
        />
        <div>
          <span className={styles.glassChip}>One workspace</span>
          <p className={styles.panelTitle}>Your money, with an AI team behind it.</p>
        </div>
      </aside>
    </div>
  );
}
