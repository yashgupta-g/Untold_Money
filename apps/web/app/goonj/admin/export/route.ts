import type { NextRequest } from "next/server";

import { getAdmin } from "@/features/goonj/campaigns/admin/auth";
import { allLeads, listCampaigns } from "@/features/goonj/campaigns/admin/queries";
import { customAnswers } from "@/features/goonj/campaigns/answers";

/** Fixed columns; one column per custom question goes before "Source". */
const HEAD = [
  "Signed up (IST)",
  "Status",
  "Campaign",
  "Link",
  "First name",
  "Last name",
  "Email",
  "Phone",
  "Profile type",
  "Profile link",
  "City",
];
const TAIL = ["Source", "Medium", "UTM campaign", "Referrer", "Consent"];

// Quote every cell, and stop spreadsheet apps from running cells as formulas.
const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  const phone = /^\+\d{1,4} \d{4,15}$/.test(s);
  if (!phone && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const ist = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Sign-ups as CSV (UTF-8 with BOM, so Excel shows Indian names correctly). */
export async function GET(req: NextRequest) {
  if (!(await getAdmin())) return new Response("Not signed in", { status: 401 });
  const q = req.nextUrl.searchParams;
  const filters = { campaign: q.get("campaign") ?? undefined, from: q.get("from") ?? undefined, to: q.get("to") ?? undefined };
  const campaigns = new Map((await listCampaigns()).map((c) => [c.id, c]));

  // Read every row first, so each custom question (from any campaign) gets
  // its own column. Sign-ups number in the thousands, so this stays small.
  const leads = [];
  for await (const rows of allLeads(filters)) leads.push(...rows);
  const answers = new Map(leads.map((l) => [l.id, new Map(customAnswers(l.data, campaigns.get(l.campaign_id)?.form))]));
  const questions = [...new Set([...answers.values()].flatMap((m) => [...m.keys()]))];

  let body = "\uFEFF" + [...HEAD, ...questions, ...TAIL].map(cell).join(",") + "\r\n";
  for (const l of leads) {
    const c = campaigns.get(l.campaign_id);
    const d = l.data ?? {};
    const mine = answers.get(l.id)!;
    body +=
      [
        ist.format(new Date(l.created_at)),
        l.status === "partial" ? "Partial (step 1 only)" : "Complete",
        c?.name ?? "Deleted campaign",
        c ? c.slug : "",
        l.first_name,
        l.last_name,
        l.email,
        l.phone,
        d.profile_type,
        d.profile_link,
        d.city,
        ...questions.map((q) => mine.get(q)),
        l.utm_source,
        l.utm_medium,
        l.utm_campaign,
        l.referrer,
        l.consent ? "Yes" : "No",
      ]
        .map(cell)
        .join(",") + "\r\n";
  }

  const name = filters.campaign ? (campaigns.get(filters.campaign)?.slug ?? "campaign") : "all";
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="goonj-signups-${name}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
