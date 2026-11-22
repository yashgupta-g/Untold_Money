import type { Metadata, Viewport } from "next";

import { SkyPage } from "@/features/goonj/v4/SkyPage";
import { AppThemePage } from "@/features/goonj/v6/AppThemePage";
import { StoryPage } from "@/features/goonj/v5/StoryPage";

export const metadata: Metadata = {
  title: "Goonj AI: where AI meets human potential",
  description:
    "Goonj is an AI mentor for working professionals. Practise the conversations, decisions and leadership moments that shape your career, by voice or video, in Hindi or English.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#e8eff9",
};

/**
 * /goonj is the latest design; earlier directions stay reachable while one
 * is chosen: ?v=app (the app's own theme) and ?v=sky.
 * ?v=talk is Latest with a new hero (v7/ForestHero: a dark vintage forest, the app rising on scroll).
 */
export default async function GoonjPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { v } = await searchParams;
  if (v === "sky") return <SkyPage />;
  if (v === "talk") return <StoryPage hero="talk" />;
  if (v === "app") return <AppThemePage />;
  return <StoryPage />;
}
