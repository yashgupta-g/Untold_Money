import Link from "next/link";

import { cn } from "@/lib/utils";
import shared from "../landing.module.css";
import styles from "./footer.module.css";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#tools", label: "Tools" },
      { href: "#story", label: "How it works" },
      { href: "#pricing", label: "Pricing" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Create account" },
    ],
  },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={cn(shared.container, styles.inner)}>
        <div className={styles.brand}>
          <Logo />
          <p>
            UntoldMoney is an analytics platform for educational and informational purposes only. It
            does not constitute financial advice. Past performance is not indicative of future
            results. Always consult a qualified financial advisor before making investment
            decisions.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} className={styles.col} aria-label={col.title}>
            <h2>{col.title}</h2>
            <ul>
              {col.links.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("#") ? (
                    <a href={link.href}>{link.label}</a>
                  ) : (
                    <Link href={link.href}>{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className={cn(shared.container, styles.base)}>
        <span>© {new Date().getFullYear()} UntoldMoney</span>
        <span>Sample data shown throughout this page.</span>
      </div>
      {/* Oversized wordmark that rises into view and fades into the page edge. */}
      <div className={styles.wordmark} aria-hidden="true">
        <svg viewBox="0 0 1000 150" data-wordmark>
          <defs>
            <linearGradient id="wordmark-ink" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" className={styles.inkTop} />
              <stop offset="1" className={styles.inkBottom} />
            </linearGradient>
          </defs>
          <text
            x="500"
            y="146"
            textAnchor="middle"
            textLength="992"
            lengthAdjust="spacingAndGlyphs"
          >
            UntoldMoney
          </text>
        </svg>
      </div>
    </footer>
  );
}
