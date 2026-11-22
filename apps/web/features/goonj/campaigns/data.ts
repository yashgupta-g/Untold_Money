import "server-only";

import { DEFAULT_PAGE, DEFAULT_SLUG } from "./defaults";
import { formSchema, heroSchema, pointsSchema, seoSchema, type Campaign, type PageContent } from "./schema";
import { publicClient, supabaseConfigured } from "./supabase";

/** A goonj_campaigns row as Postgres returns it. */
export type CampaignRow = {
  id: string;
  slug: string;
  name: string;
  kind: Campaign["kind"];
  status: Campaign["status"];
  is_template: boolean;
  starts_at: string | null;
  ends_at: string | null;
  hero: unknown;
  form: unknown;
  points: unknown;
  seo: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export const campaignTag = (slug: string) => `goonj-campaign:${slug}`;

/** Parses stored JSON through the schema, so the page always gets clean data. */
export function toCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    status: row.status,
    isTemplate: row.is_template,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    hero: heroSchema.parse(row.hero),
    form: formSchema.parse(row.form),
    points: pointsSchema.parse(row.points),
    seo: seoSchema.parse(row.seo ?? {}),
  };
}

export type LiveCampaign = PageContent & { id: string | null };

/**
 * The live campaign for a link. Cached until an editor saves it (the
 * dashboard expires the tag); time windows are re-checked every 5 minutes.
 */
async function loadLive(slug: string): Promise<LiveCampaign | null> {
  // RLS only returns published, in-window, non-deleted rows to the anon key.
  // The dev server doesn't expire tagged fetches reliably, so only cache in production.
  const cache = process.env.NODE_ENV === "production" ? { tags: [campaignTag(slug)], revalidate: 300 } : undefined;
  const { data, error } = await publicClient(cache)
    .from("goonj_campaigns")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<CampaignRow>();
  if (error) throw new Error(`Couldn't load campaign "${slug}": ${error.message}`);
  if (!data) return null;
  const c = toCampaign(data);
  return { id: c.id, slug: c.slug, hero: c.hero, form: c.form, points: c.points, seo: c.seo };
}

export function getLiveCampaign(slug: string): Promise<LiveCampaign | null> {
  if (!supabaseConfigured()) {
    return Promise.resolve(slug === DEFAULT_SLUG ? { ...DEFAULT_PAGE, id: null } : null);
  }
  return loadLive(slug);
}

/** The default limited-release page. Falls back to the built-in copy. */
export async function getDefaultPage(): Promise<LiveCampaign> {
  try {
    return (await getLiveCampaign(DEFAULT_SLUG)) ?? { ...DEFAULT_PAGE, id: null };
  } catch {
    return { ...DEFAULT_PAGE, id: null };
  }
}
