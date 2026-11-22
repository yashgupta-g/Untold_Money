import localFont from "next/font/local";

// Geist (Vercel, SIL OFL; variable, from the `geist` npm package): the voice
// for every heading, sub heading and line of copy on the new-hero page.
// Self-hosted because the dev container can't reach Google Fonts. General
// Sans (v4/fonts) is kept for the hero headline only.
export const geist = localFont({
  src: "../fonts/geist-var.woff2",
  weight: "100 900",
  variable: "--font-geist",
  display: "swap",
});
