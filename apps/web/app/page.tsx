import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";

import { cn } from "@/lib/utils";
import { Bento } from "@/features/landing/components/Bento";
import { Faq } from "@/features/landing/components/Faq";
import { FinalCta } from "@/features/landing/components/FinalCta";
import { Footer } from "@/features/landing/components/Footer";
import { HeroSwitcher } from "@/features/landing/components/heroes/HeroSwitcher";
import { Integrations } from "@/features/landing/components/Integrations";
import { LandingMotion } from "@/features/landing/components/LandingMotion";
import { Method } from "@/features/landing/components/Method";
import { Nav } from "@/features/landing/components/Nav";
import { Platform } from "@/features/landing/components/Platform";
import { Pricing } from "@/features/landing/components/Pricing";
import { Reel } from "@/features/landing/components/Reel";
import { Showcase } from "@/features/landing/components/Showcase";
import { Story } from "@/features/landing/components/Story";
import { Ticker } from "@/features/landing/components/Ticker";
import { Toolkit } from "@/features/landing/components/Toolkit";
import { Tour } from "@/features/landing/components/Tour";
import { WhyDark } from "@/features/landing/components/WhyDark";
import styles from "@/features/landing/landing.module.css";
import tokens from "@/features/landing/tokens.module.css";

// SF Pro Display renders from the visitor's own Apple system font (see
// tokens.module.css); Inter is the fallback on every other platform.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "UntoldMoney: AI-powered personal finance",
  description:
    "Market data, AI stock analysis on your terms, capital allocation, broker trading, backtesting, an AI analyst and a trade journal in one workspace.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  // Mirrors --bg in tokens.module.css (meta tags can't read CSS variables).
  themeColor: "#ffffff",
};

export default function HomePage() {
  return (
    <div className={cn(inter.variable, serif.variable, tokens.theme, styles.page)}>
      <Nav />
      <main>
        {/* Design preview: swaps between hero options until one is chosen. */}
        <HeroSwitcher />
        <Ticker />
        <Platform />
        <Toolkit />
        <Tour />
        <Reel />
        <Showcase />
        <Story />
        <WhyDark />
        <Bento />
        <Integrations />
        <Method />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      {/* Last, so its triggers are measured after the pinned sections above. */}
      <LandingMotion />
    </div>
  );
}
