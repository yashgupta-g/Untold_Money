"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

import { SPRING } from "../motion";

type TiltProps = {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees. */
  max?: number;
};

/**
 * 3D tilt toward a mouse cursor with spring physics. Exposes the cursor
 * position as --mx / --my so a child can paint a spotlight.
 */
export function Tilt({ children, className, max = 5 }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rx = useSpring(0, SPRING);
  const ry = useSpring(0, SPRING);
  const lift = useSpring(0, SPRING);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const mxPct = useMotionTemplate`${mx}%`;
  const myPct = useMotionTemplate`${my}%`;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={
        {
          rotateX: rx,
          rotateY: ry,
          y: lift,
          transformPerspective: 1100,
          "--mx": mxPct,
          "--my": myPct,
        } as unknown as CSSProperties
      }
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry.set((px - 0.5) * 2 * max);
        rx.set(-(py - 0.5) * 2 * max);
        lift.set(-6);
        mx.set(px * 100);
        my.set(py * 100);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
        lift.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
