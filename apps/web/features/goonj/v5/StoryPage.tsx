import { cn } from "@/lib/utils";
import { LandingMotion } from "@/features/landing/components/LandingMotion";

import { generalSans, switzer } from "../v4/fonts";
import { FloatingNav } from "../v4/Hero";
import { Faq, Final, Footer, Mentors, Trust } from "../v4/Sections";
import tokens from "../v4/tokens.module.css";
import u from "../v4/ui.module.css";
import { Everyday, HowApp, Plans, Progress, Promises, Tracks } from "./AppSections";
import { Film } from "./Film";
import { Proof } from "./Proof";
import { StoryHero } from "./StoryHero";
import { WhySlider } from "./why/WhySlider";
import { AppShowcase } from "../v6/AppShowcase";
import { AppStatement } from "../v6/AppStatement";
import { geist } from "../v7/fonts";
import { GlassFooter } from "../v7/GlassFooter";
import { ForestHero } from "../v7/ForestHero";
import type7 from "../v7/type.module.css";

/** The hero ideas being compared; the rest of the page is shared. */
export type HeroVariant = "story" | "talk";

/** Goonj v5: a real sky, and a hero that shows what Goonj is. Latest tells one working day. */
export function StoryPage({ hero = "story" }: { hero?: HeroVariant }) {
  // the new-hero treatments (glass nav and footer, Geist type, poster statement) apply to every hero but Latest's
  const fresh = hero !== "story";
  return (
    <div className={cn(generalSans.variable, switzer.variable, tokens.theme, u.page, fresh && [geist.variable, type7.type])}>
      {/* the new hero brings its own fixed glass nav */}
      {!fresh && <FloatingNav />}
      <main>
        {hero === "talk" ? <ForestHero /> : <StoryHero />}
        <AppStatement look={fresh ? "poster" : "app"} />
        {/* Why, then what it is, then how: the argument before the features. */}
        <WhySlider />
        <Film />
        {/* the app itself: promises, flow, tracks, progress, everyday, plans */}
        <AppShowcase />
        <Promises />
        <HowApp />
        <Tracks />
        <Progress />
        <Everyday />
        <Mentors />
        <Plans />
        <Proof />
        {/* the new-hero page drops the "A safe space to practise" strip */}
        {!fresh && <Trust />}
        <Faq />
        <Final />
      </main>
      {fresh ? <GlassFooter /> : <Footer />}
      <LandingMotion />
    </div>
  );
}
