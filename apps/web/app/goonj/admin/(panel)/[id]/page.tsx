import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { Editor } from "@/features/goonj/campaigns/admin/Editor";
import { getCampaign } from "@/features/goonj/campaigns/admin/queries";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return <Editor key={campaign.id} campaign={campaign} origin={origin} />;
}
