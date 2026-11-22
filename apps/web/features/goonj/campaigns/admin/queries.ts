import "server-only";

import { toCampaign, type CampaignRow } from "../data";
import type { Campaign } from "../schema";
import { requireAdmin } from "./auth";

export type CampaignListItem = Campaign & { leads: number; lastLeadAt: string | null };

export async function listCampaigns(): Promise<CampaignListItem[]> {
  const { supabase } = await requireAdmin();
  const [{ data: rows, error }, { data: counts }] = await Promise.all([
    supabase.from("goonj_campaigns").select("*").order("updated_at", { ascending: false }),
    supabase.from("goonj_campaign_lead_counts").select("*"),
  ]);
  if (error) throw new Error(error.message);
  const byId = new Map((counts ?? []).map((c) => [c.campaign_id as string, c]));
  return (rows as CampaignRow[]).map((r) => {
    const c = byId.get(r.id);
    return { ...toCampaign(r), leads: c?.leads ?? 0, lastLeadAt: c?.last_lead_at ?? null };
  });
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("goonj_campaigns").select("*").eq("id", id).maybeSingle<CampaignRow>();
  return data ? toCampaign(data) : null;
}

export type LeadFilters = { campaign?: string; from?: string; to?: string; page?: number };

export type LeadRow = {
  id: string;
  campaign_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  data: Record<string, string>;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  consent: boolean;
  /** "partial": stopped after step 1 of a two-step form (name + email only). */
  status: "partial" | "complete";
  created_at: string;
};

export const LEADS_PAGE = 50;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

/** Dates are whole days in India time (the team's time zone). */
export function leadRange(f: LeadFilters) {
  return {
    from: f.from && DAY.test(f.from) ? `${f.from}T00:00:00+05:30` : null,
    to: f.to && DAY.test(f.to) ? `${f.to}T23:59:59.999+05:30` : null,
    campaign: f.campaign && UUID.test(f.campaign) ? f.campaign : null,
  };
}

export async function listLeads(f: LeadFilters) {
  const { supabase } = await requireAdmin();
  const r = leadRange(f);
  const page = Math.max(1, f.page ?? 1);
  let q = supabase.from("goonj_leads").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (r.campaign) q = q.eq("campaign_id", r.campaign);
  if (r.from) q = q.gte("created_at", r.from);
  if (r.to) q = q.lte("created_at", r.to);
  const { data, count, error } = await q.range((page - 1) * LEADS_PAGE, page * LEADS_PAGE - 1);
  if (error) throw new Error(error.message);
  return { leads: (data ?? []) as LeadRow[], total: count ?? 0 };
}

/** Every matching lead, fetched 1,000 at a time (Supabase's row cap). */
export async function* allLeads(f: LeadFilters) {
  const { supabase } = await requireAdmin();
  const r = leadRange(f);
  const CHUNK = 1000;
  for (let from = 0; ; from += CHUNK) {
    let q = supabase.from("goonj_leads").select("*").order("created_at", { ascending: false });
    if (r.campaign) q = q.eq("campaign_id", r.campaign);
    if (r.from) q = q.gte("created_at", r.from);
    if (r.to) q = q.lte("created_at", r.to);
    const { data, error } = await q.range(from, from + CHUNK - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as LeadRow[];
    if (rows.length) yield rows;
    if (rows.length < CHUNK) return;
  }
}
