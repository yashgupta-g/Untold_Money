import { generalSans } from "../../v4/fonts";
import { geist } from "../../v7/fonts";
import s from "../campaign.module.css";
import type { PageContent } from "../schema";
import { Hero } from "./Hero";
import { MetalDefs } from "./hero/MetalIcon";
import { PageMotion } from "./PageMotion";
import { Points } from "./points";
import { Nav } from "./Nav";
import { Footer, GetsYou, Stories } from "./Sections";
import { SmoothScroll } from "./SmoothScroll";

/**
 * The one template behind goonj.com/limited-release and every campaign link.
 * Dynamic: the hero, the sign-up form and the points. Static: everything else.
 * The form sits in the middle of the hero, so it's visible on arrival; proof
 * (stories) comes next, then the reasons (points).
 */
export function CampaignPage({
  content,
  preview,
}: {
  content: PageContent;
  preview?: boolean;
}) {
  const { hero, points } = content;
  return (
    <div className={`${s.theme} ${geist.variable} ${generalSans.variable}`}>
      <MetalDefs />
      <Nav />
      <main>
        <Hero content={content} preview={preview} />
        <Stories />
        <Points points={points} />
        <GetsYou />
      </main>
      <Footer cta={hero.ctaLabel} />
      <PageMotion cta={hero.ctaLabel} />
      {preview ? null : <SmoothScroll />}
    </div>
  );
}
