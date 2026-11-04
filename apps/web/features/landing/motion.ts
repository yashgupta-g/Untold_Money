// Shared motion vocabulary for the landing page.

/** Interaction spring (magnetic buttons, tilt, toggles). */
export const SPRING = { stiffness: 220, damping: 22, mass: 0.6 } as const;

/** Section reveal: fade + 12px rise, 600ms, cubic-bezier(.2, .8, .2, 1) as SVG path data. */
export const REVEAL = {
  rise: 12,
  duration: 0.6,
  ease: "M0,0 C0.2,0.8 0.2,1 1,1",
} as const;

/** Stagger between items in a cascade, in seconds. */
export const STAGGER = 0.06;

/** Pinned / scrubbed effects only run on wide screens with motion allowed. */
export const MQ_DESKTOP_MOTION = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
export const MQ_MOTION = "(prefers-reduced-motion: no-preference)";
export const MQ_REDUCE = "(prefers-reduced-motion: reduce)";
