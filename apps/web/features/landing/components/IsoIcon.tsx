import type { Icon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { IsoBox, IsoTop, type IsoView } from "./iso";
import styles from "./isoicon.module.css";

/** A small isometric tile with an icon lying on its top face. */
const VIEW: IsoView = { s: 18, ox: 30, oy: 3 };
const INSET = 0.12;
const BOX = { x: 0, y: 0, w: 1.7, d: 1.7, h: 0.55 };

export function IsoIcon({
  icon: Glyph,
  tone = "cobalt",
  size = 56,
  className,
}: {
  icon: Icon;
  tone?: "cobalt" | "light" | "soon";
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 60 50"
      width={size}
      height={(size * 50) / 60}
      className={cn(styles.tile, className)}
      data-tone={tone}
      aria-hidden="true"
    >
      <IsoBox
        view={VIEW}
        box={BOX}
        faceClass={{ top: styles.top, left: styles.left, right: styles.right }}
      />
      <IsoTop view={VIEW} box={BOX} inset={INSET}>
        <Glyph size={24} weight="fill" className={styles.glyph} />
      </IsoTop>
    </svg>
  );
}
