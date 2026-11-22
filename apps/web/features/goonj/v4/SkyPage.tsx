import { cn } from "@/lib/utils";
import { LandingMotion } from "@/features/landing/components/LandingMotion";

import { Demo } from "./Demo";
import { generalSans, switzer } from "./fonts";
import { FloatingNav, Hero } from "./Hero";
import { Faq, Final, Footer, How, Mentors, Stories, Trust, Why } from "./Sections";
import tokens from "./tokens.module.css";
import u from "./ui.module.css";

/** Goonj v4: soft sky, frosted glass, real people. */
export function SkyPage() {
  return (
    <div className={cn(generalSans.variable, switzer.variable, tokens.theme, u.page)}>
      <FloatingNav />
      <main>
        <Hero />
        <Why />
        <How />
        <Demo />
        <Mentors />
        <Stories />
        <Trust />
        <Faq />
        <Final />
      </main>
      <Footer />
      <LandingMotion />
    </div>
  );
}
