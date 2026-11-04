import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import shared from "../../landing.module.css";
import styles from "./parts.module.css";

/**
 * The two hero actions every design option shares. `tone` picks colours for
 * the surface behind them; `className` lets an option restyle the shapes.
 */
export function HeroCtas({
  tone = "ink",
  className,
  primaryClassName,
  secondaryClassName,
}: {
  tone?: "ink" | "light";
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
}) {
  return (
    <div className={cn(styles.ctas, className)} data-tone={tone}>
      <Link className={cn(shared.btn, styles.primary, primaryClassName)} href="/register">
        Get started free
        <span className={styles.arrow}>
          <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
        </span>
      </Link>
      <a className={cn(shared.btn, styles.secondary, secondaryClassName)} href="#story">
        See how it works
      </a>
    </div>
  );
}
