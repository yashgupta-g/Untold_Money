import { cn } from "@/lib/utils";
import { LandingMotion } from "@/features/landing/components/LandingMotion";

import { generalSans, switzer } from "../v4/fonts";
import { FloatingNav } from "../v4/Hero";
import { Faq, Final, Footer, Mentors, Trust } from "../v4/Sections";
import tokens from "../v4/tokens.module.css";
import u from "../v4/ui.module.css";
import { Everyday, HowApp, Plans, Progress, Promises, Tracks } from "../v5/AppSections";
import { Film } from "../v5/Film";
import { Proof } from "../v5/Proof";
import { AppShowcase } from "./AppShowcase";
import { AppStatement } from "./AppStatement";
import { StoryHero } from "../v5/StoryHero";
import { WhySlider } from "../v5/why/WhySlider";
import app from "./tokens.module.css";

/**
 * Goonj v6: the same page, flow and copy as v5, dressed in the app's own
 * theme (charcoal, emerald glows, white pills, neon orange). Sections read
 * the `data-goonj="app"` attribute for the few places a token can't reach.
 */
export function AppThemePage() {
  return (
    <div data-goonj="app" className={cn(generalSans.variable, switzer.variable, tokens.theme, app.app, u.page)}>
      <FloatingNav />
      <main>
        <StoryHero />
        <AppStatement />
        <WhySlider />
        <Film />
        <AppShowcase />
        <Promises />
        <HowApp />
        <Tracks />
        <Progress />
        <Everyday />
        <Mentors />
        <Plans />
        <Proof />
        <Trust />
        <Faq />
        <Final />
      </main>
      <Footer />
      <LandingMotion />
    </div>
  );
}
