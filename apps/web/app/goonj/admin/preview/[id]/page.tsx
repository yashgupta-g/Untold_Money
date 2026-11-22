import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/features/goonj/campaigns/admin/auth";
import { LivePreview } from "@/features/goonj/campaigns/admin/LivePreview";
import { getCampaign } from "@/features/goonj/campaigns/admin/queries";

export const metadata: Metadata = { title: "Preview · Goonj campaigns", robots: { index: false, follow: false } };

/**
 * A draft or live campaign as visitors will see it, for editors only.
 * Inside the editor it follows unsaved edits; opened on its own it shows
 * the saved version.
 */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await getCampaign(id);
  if (!c) notFound();
  return <LivePreview initial={{ slug: c.slug, hero: c.hero, form: c.form, points: c.points, seo: c.seo }} />;
}
