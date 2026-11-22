import type { Metadata, Viewport } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { getLiveCampaign } from "@/features/goonj/campaigns/data";
import { DEFAULT_SLUG } from "@/features/goonj/campaigns/defaults";
import { CampaignPage } from "@/features/goonj/campaigns/page/CampaignPage";
import { SLUG_RE } from "@/features/goonj/campaigns/schema";

type Props = { params: Promise<{ slug: string }> };

export const viewport: Viewport = { themeColor: "#010d12", viewportFit: "cover" };

async function load(slug: string) {
  if (!SLUG_RE.test(slug)) return null;
  return getLiveCampaign(slug).catch((e) => {
    console.error("[goonj]", e);
    return null;
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await load(slug);
  if (!c) return { title: "Goonj" };
  const title = c.seo.title || `${c.hero.title} | Goonj`;
  const description = c.seo.description || c.hero.subtitle;
  const image = c.seo.ogImage || (c.hero.media.type === "image" ? c.hero.media.url : c.hero.media.poster);
  return {
    title,
    description,
    openGraph: { title, description, images: image ? [image] : undefined, type: "website" },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

/** goonj.com/c/<slug>: one campaign or influencer page. */
export default async function CampaignRoute({ params }: Props) {
  const { slug } = await params;
  if (slug === DEFAULT_SLUG) permanentRedirect("/goonj/limited-release");
  const c = await load(slug);
  if (!c) notFound();
  return <CampaignPage content={c} />;
}
