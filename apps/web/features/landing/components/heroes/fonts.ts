import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";

// Display faces for the hero design options. Not preloaded: each one only
// downloads when the option that uses it is on screen.

/** Anthropomorphic: a grotesque with a hand-cut, friendly edge. */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  preload: false,
  variable: "--font-bricolage",
});

/** Exploded view and X-ray: drawing callouts and instrument readouts. */
export const mono = Geist_Mono({
  subsets: ["latin"],
  preload: false,
  variable: "--font-mono",
});
