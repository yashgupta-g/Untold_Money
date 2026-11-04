import Link from "next/link";

import { cn } from "@/lib/utils";
import styles from "../landing.module.css";

/** Wordmark; `light` sits on photography, `dark` on the white page. */
export function Logo({ tone = "dark" }: { tone?: "light" | "dark" }) {
  return (
    <Link
      className={cn(styles.logo, tone === "light" && styles.logoLight)}
      href="/"
      aria-label="UntoldMoney home"
    >
      <span className={styles.logoMark}>
        <svg width="16" height="16" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M2 10 10 2h6L2 16zM24 16l-8 8h-6l14-14z" fill="currentColor" />
        </svg>
      </span>
      UntoldMoney
    </Link>
  );
}
