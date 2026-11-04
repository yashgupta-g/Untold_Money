"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";

import { SPRING } from "../motion";

type MagneticProps = {
  children: ReactNode;
  /** Share of the cursor's offset from centre the element follows. */
  strength?: number;
  className?: string;
  /** Stretch to the parent's width instead of hugging the child. */
  block?: boolean;
};

/** Pulls its child toward a mouse cursor and presses to 0.97 on tap. */
export function Magnetic({ children, strength = 0.3, className, block }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y, display: block ? "flex" : "inline-flex" }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", ...SPRING }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
