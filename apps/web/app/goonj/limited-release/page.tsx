import type { Metadata, Viewport } from "next";

import { getDefaultPage } from "@/features/goonj/campaigns/data";
import { CampaignPage } from "@/features/goonj/campaigns/page/CampaignPage";

export const viewport: Viewport = { themeColor: "#010d12", viewportFit: "cover" };

export async function generateMetadata(): Promise<Metadata> {
  const c = await getDefaultPage();
  return {
    title: c.seo.title || "Goonj AI - Get Early Access",
    description: c.seo.description || c.hero.subtitle,
  };
}

/**
 * The limited-release page (goonj.com/limited-release). Same template as the
 * campaign links; its content is the "limited-release" row in the dashboard.
 */
export default async function LimitedReleasePage() {
  const content = await getDefaultPage();
  return <CampaignPage content={content} />;
}
