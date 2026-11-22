"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { campaignTag, toCampaign, type CampaignRow } from "../data";
import { DEFAULT_PAGE, DEFAULT_SLUG } from "../defaults";
import { campaignInputSchema, SLUG_RE, RESERVED_SLUGS, type CampaignInput, type Kind } from "../schema";
import { serviceClient, sessionClient, mediaUrl } from "../supabase";
import { ADMIN_HOME, ADMIN_LOGIN, assertAdmin } from "./auth";

export type SaveResult =
  | { ok: true; id: string; slug: string; updatedAt: string; status: string }
  | { ok: false; message: string; errors?: Record<string, string> };

const toRow = (input: CampaignInput) => ({
  name: input.name,
  slug: input.slug,
  kind: input.kind,
  is_template: input.isTemplate,
  starts_at: input.startsAt,
  ends_at: input.endsAt,
  hero: input.hero,
  form: input.form,
  points: input.points,
  seo: input.seo,
});

const expire = (...slugs: (string | undefined)[]) => {
  for (const s of new Set(slugs.filter(Boolean) as string[])) updateTag(campaignTag(s));
};

function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const i of issues) errors[i.path.map(String).join(".")] ??= i.message;
  return errors;
}

const friendly = (message: string) =>
  /duplicate key|goonj_campaigns_slug_key/.test(message) ? "That link is already used by another campaign." : message;

// Auth ---------------------------------------------------------------------

export async function signIn(_prev: { error?: string; email?: string } | undefined, fd: FormData) {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };
  const supabase = await sessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "That email and password don't match.", email };
  const { data: row } = await supabase.from("goonj_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!row) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have access to the campaign dashboard.", email };
  }
  redirect(ADMIN_HOME);
}

export async function signOut() {
  const supabase = await sessionClient();
  await supabase.auth.signOut();
  redirect(ADMIN_LOGIN);
}

// Campaigns ----------------------------------------------------------------

export async function checkSlug(slug: string, id?: string): Promise<{ ok: boolean; message?: string }> {
  const { supabase } = await assertAdmin();
  const s = slug.trim().toLowerCase();
  if (!SLUG_RE.test(s)) return { ok: false, message: "Use 2–40 lowercase letters, numbers or dashes" };
  if (RESERVED_SLUGS.includes(s)) return { ok: false, message: "That link is reserved" };
  const { data } = await supabase.from("goonj_campaigns").select("id").eq("slug", s).maybeSingle();
  if (data && data.id !== id) return { ok: false, message: "That link is already used by another campaign" };
  return { ok: true };
}

/** Creates a draft from a template, from another campaign, or from the default page. */
export async function createCampaign(fd: FormData) {
  const { supabase, user } = await assertAdmin();
  const name = String(fd.get("name") ?? "").trim() || "Untitled campaign";
  const kind = (String(fd.get("kind") ?? "influencer") as Kind) || "influencer";
  const from = String(fd.get("from") ?? "");
  let slug = String(fd.get("slug") ?? "").trim().toLowerCase();

  let base = { hero: DEFAULT_PAGE.hero, form: DEFAULT_PAGE.form, points: DEFAULT_PAGE.points, seo: {} as object };
  if (from) {
    const { data } = await supabase.from("goonj_campaigns").select("*").eq("id", from).maybeSingle<CampaignRow>();
    if (data) {
      const c = toCampaign(data);
      base = { hero: c.hero, form: c.form, points: c.points, seo: c.seo };
    }
  }
  const check = await checkSlug(slug);
  if (!check.ok) slug = `${slug || "campaign"}-${randomUUID().slice(0, 4)}`.replace(/^-+/, "").slice(0, 40);

  const { data, error } = await supabase
    .from("goonj_campaigns")
    .insert({
      name,
      slug,
      kind: kind === "default" ? "influencer" : kind,
      status: "draft",
      ...base,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(friendly(error.message));
  redirect(`${ADMIN_HOME}/${data.id}`);
}

export async function saveCampaign(id: string, raw: unknown): Promise<SaveResult> {
  const { supabase, user } = await assertAdmin();
  const parsed = campaignInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Some fields need attention.", errors: issuesToErrors(parsed.error.issues) };
  }
  const { data: before } = await supabase.from("goonj_campaigns").select("slug, kind").eq("id", id).maybeSingle();
  if (!before) return { ok: false, message: "This campaign no longer exists." };
  const input = parsed.data;
  // The default page keeps its link and kind.
  if (before.kind === "default") {
    input.slug = DEFAULT_SLUG;
    input.kind = "default";
  } else if (input.kind === "default" || input.slug === DEFAULT_SLUG) {
    return { ok: false, message: "That link is reserved for the default page.", errors: { slug: "Reserved" } };
  }
  const { data, error } = await supabase
    .from("goonj_campaigns")
    .update({ ...toRow(input), updated_by: user.id })
    .eq("id", id)
    .select("id, slug, updated_at, status")
    .single();
  if (error) return { ok: false, message: friendly(error.message) };
  expire(before.slug, data.slug);
  return { ok: true, id: data.id, slug: data.slug, updatedAt: data.updated_at, status: data.status };
}

export async function setStatus(id: string, status: "draft" | "published" | "archived"): Promise<SaveResult> {
  const { supabase, user } = await assertAdmin();
  const { data: row } = await supabase.from("goonj_campaigns").select("*").eq("id", id).maybeSingle<CampaignRow>();
  if (!row) return { ok: false, message: "This campaign no longer exists." };
  if (row.kind === "default" && status !== "published") {
    return { ok: false, message: "The default limited-release page always stays live." };
  }
  if (status === "published") {
    // Never publish content that doesn't pass the rules.
    const check = campaignInputSchema.safeParse({
      name: row.name,
      slug: row.slug,
      kind: row.kind,
      isTemplate: row.is_template,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      hero: row.hero,
      form: row.form,
      points: row.points,
      seo: row.seo,
    });
    if (!check.success) return { ok: false, message: "Fix the highlighted fields and save before publishing." };
  }
  const { data, error } = await supabase
    .from("goonj_campaigns")
    .update({ status, deleted_at: status === "archived" ? new Date().toISOString() : null, updated_by: user.id })
    .eq("id", id)
    .select("id, slug, updated_at, status")
    .single();
  if (error) return { ok: false, message: friendly(error.message) };
  expire(data.slug);
  return { ok: true, id: data.id, slug: data.slug, updatedAt: data.updated_at, status: data.status };
}

export async function duplicateCampaign(id: string) {
  const { supabase, user } = await assertAdmin();
  const { data: row } = await supabase.from("goonj_campaigns").select("*").eq("id", id).maybeSingle<CampaignRow>();
  if (!row) throw new Error("This campaign no longer exists.");
  const slug = `${row.slug.slice(0, 33)}-copy-${randomUUID().slice(0, 2)}`;
  const { data, error } = await supabase
    .from("goonj_campaigns")
    .insert({
      name: `${row.name} (copy)`.slice(0, 120),
      slug,
      kind: row.kind === "default" ? "influencer" : row.kind,
      status: "draft",
      is_template: false,
      hero: row.hero,
      form: row.form,
      points: row.points,
      seo: row.seo,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(friendly(error.message));
  redirect(`${ADMIN_HOME}/${data.id}`);
}

/** Permanently deletes an archived campaign that has no sign-ups. */
export async function deleteCampaign(id: string): Promise<SaveResult> {
  const { supabase } = await assertAdmin();
  const { data: row } = await supabase.from("goonj_campaigns").select("slug, status, kind").eq("id", id).maybeSingle();
  if (!row) return { ok: false, message: "This campaign no longer exists." };
  if (row.kind === "default") return { ok: false, message: "The default page can't be deleted." };
  if (row.status !== "archived") return { ok: false, message: "Archive the campaign before deleting it." };
  const { count } = await supabase
    .from("goonj_leads")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", id);
  if (count) return { ok: false, message: `It has ${count} sign-ups, so it's kept archived instead.` };
  const { error } = await supabase.from("goonj_campaigns").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  expire(row.slug);
  return { ok: true, id, slug: row.slug, updatedAt: new Date().toISOString(), status: "deleted" };
}

// Media --------------------------------------------------------------------

const MEDIA_TYPES: Record<string, { ext: string; max: number }> = {
  "image/jpeg": { ext: "jpg", max: 10 },
  "image/png": { ext: "png", max: 10 },
  "image/webp": { ext: "webp", max: 10 },
  "image/avif": { ext: "avif", max: 10 },
  "video/mp4": { ext: "mp4", max: 50 },
  "video/webm": { ext: "webm", max: 50 },
};

/** A one-time upload slot in the media bucket. The browser uploads straight to it. */
export async function createUploadUrl(contentType: string, size: number) {
  await assertAdmin();
  const t = MEDIA_TYPES[contentType];
  if (!t) return { ok: false as const, message: "Use a JPG, PNG, WebP or AVIF image, or an MP4 or WebM video." };
  if (size > t.max * 1024 * 1024) return { ok: false as const, message: `Keep this file under ${t.max} MB.` };
  const path = `campaigns/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${t.ext}`;
  const { data, error } = await serviceClient().storage.from("goonj-media").createSignedUploadUrl(path);
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, path, token: data.token, publicUrl: mediaUrl(path) };
}
