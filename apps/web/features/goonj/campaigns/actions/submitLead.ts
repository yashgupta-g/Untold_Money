"use server";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

import { answerKey } from "../answers";
import { getLiveCampaign } from "../data";
import { cleanPhone, formSteps, leadSchemaFor, validPhone, type FormField } from "../schema";
import { serviceClient, supabaseConfigured } from "../supabase";

/** A step-1 lead the visitor may complete in step 2. The token proves it's theirs. */
export type LeadRef = { id: string; token: string };

export type LeadState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors: Record<string, string>;
      values: Record<string, string>;
      step: 1 | 2;
      lead?: LeadRef;
    }
  | { status: "step2"; lead: LeadRef; firstName: string }
  | { status: "success"; firstName: string };

// New sign-ups per IP per window. Offices and colleges often share one IP,
// so this is generous; it only has to stop scripted floods.
const RATE_LIMIT = 30;
const RATE_WINDOW_MIN = 10;
const MIN_FILL_MS = 1200; // faster than this is a bot (browser autofill + a click takes longer)
const COLUMNS = ["first_name", "last_name", "email", "phone"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const clip = (v: string, n = 200) => (v ? v.slice(0, n) : null);

const sign = (id: string) =>
  createHmac("sha256", process.env.GOONJ_LEAD_SALT ?? "")
    .update(`goonj-lead:${id}`)
    .digest("base64url");

function verified(fd: FormData): LeadRef | undefined {
  const id = str(fd.get("_lead"));
  const token = str(fd.get("_lead_token"));
  if (!UUID.test(id) || !token) return undefined;
  const a = Buffer.from(sign(id));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b) ? { id, token } : undefined;
}

/**
 * The public sign-up form. `_step` says what was sent:
 * - "all": a one-step form (every field + the consent box) → a complete lead
 * - "1": step 1 of a two-step form (name + email) → a partial lead
 * - "2": step 2 (the rest) → completes the partial lead from step 1
 */
export async function submitLead(_prev: LeadState, fd: FormData): Promise<LeadState> {
  const slug = str(fd.get("_slug"));
  const mode = str(fd.get("_step")) || "all";
  const lead = verified(fd);
  const step: 1 | 2 = mode === "2" ? 2 : 1;
  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (!k.startsWith("_") && typeof v === "string") values[k] = v;
  const fail = (message: string, fieldErrors: Record<string, string> = {}, at: 1 | 2 = step): LeadState => ({
    status: "error",
    message,
    fieldErrors,
    values,
    step: at,
    lead,
  });

  // Bots fill the hidden field or submit instantly. Pretend it worked, but
  // log it, so a real person caught by mistake shows up in the server logs.
  const started = Number(str(fd.get("_t")));
  const trap = str(fd.get("_hp"))
    ? "hidden field filled"
    : !started
      ? "no start time"
      : Date.now() - started < MIN_FILL_MS
        ? `sent ${Date.now() - started}ms after load`
        : null;
  if (trap) {
    console.warn(`[goonj] sign-up dropped by the bot check (${trap}) on ${slug}`);
    return { status: "success", firstName: "" };
  }

  if (!supabaseConfigured()) return fail("Sign-ups aren't connected yet. Please try again later.");

  const campaign = await getLiveCampaign(slug).catch(() => null);
  if (!campaign?.id) return fail("This page is no longer accepting sign-ups.");

  // Check exactly the fields this step collects, as stored on the server.
  const steps = formSteps(campaign.form);
  let fields: FormField[];
  if (mode === "all" || steps.length === 1) fields = campaign.form.fields;
  else fields = step === 2 ? steps[1] : steps[0];
  if (step === 2 && !lead) return fail("Your session expired. Please enter your details again.", {}, 1);

  const parsed = leadSchemaFor(fields).safeParse(values);
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
  }
  const data = (parsed.success ? parsed.data : {}) as Record<string, string>;

  const country = str(fd.get("_phone_country")) || "+91";
  if (fields.some((f) => f.key === "phone") && !fieldErrors.phone) {
    const digits = cleanPhone(values.phone ?? "", country);
    if (digits && !validPhone(digits, country)) {
      fieldErrors.phone = country === "+91" ? "Enter a 10-digit mobile number" : "Enter a valid phone number";
    }
    data.phone = digits ? `${country} ${digits}` : "";
  }

  // One-step forms have a consent box. Two-step forms ask on step 1, where
  // the button says "By continuing, you agree to…".
  const consent = mode === "all" ? str(fd.get("_consent")) === "on" : true;
  if (!consent) fieldErrors._consent = "Please agree to continue";

  if (Object.keys(fieldErrors).length) return fail("Please check the highlighted fields.", fieldErrors);

  if (data.full_name && !data.first_name) {
    const [first, ...rest] = data.full_name.split(/\s+/);
    data.first_name = first;
    data.last_name = rest.join(" ");
  }
  // Only write the columns this step asked for, so step 2 never blanks step 1.
  const asked = new Set<string>(fields.map((f) => f.key));
  if (asked.has("full_name")) asked.add("first_name").add("last_name");
  const columns: Record<string, string | null> = {};
  for (const k of COLUMNS) if (asked.has(k)) columns[k] = clip(data[k] ?? "", k === "phone" ? 24 : 200);
  const extra: Record<string, string> = {};
  for (const f of fields) {
    if ((COLUMNS as readonly string[]).includes(f.key) || f.key === "full_name" || !data[f.key]) continue;
    // Custom questions are saved under the question text (see answers.ts).
    const key = f.key.startsWith("custom_") ? answerKey(f.label, f.key, extra) : f.key;
    extra[key] = data[f.key];
  }
  const profileType = str(fd.get("_profile_type"));
  if (extra.profile_link && profileType) extra.profile_type = profileType.slice(0, 40);

  const db = serviceClient();

  // Step 2, or step 1 sent again after "Back": update the visitor's own lead.
  if (lead) {
    const patch =
      step === 2
        ? { ...columns, data: extra, status: "complete", completed_at: new Date().toISOString() }
        : columns;
    const { data: row, error } = await db
      .from("goonj_leads")
      .update(patch)
      .eq("id", lead.id)
      .eq("campaign_id", campaign.id)
      .eq("status", "partial")
      .select("first_name")
      .maybeSingle<{ first_name: string | null }>();
    if (error) {
      console.error("[goonj] lead update failed", error.message);
      return fail("Something went wrong on our side. Please try again.");
    }
    // No row: it was already completed (e.g. a double click). Treat as done.
    if (step === 2 || !row) return { status: "success", firstName: row?.first_name ?? data.first_name ?? "" };
    return { status: "step2", lead, firstName: row.first_name ?? "" };
  }

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256")
    .update(`${process.env.GOONJ_LEAD_SALT ?? ""}:${ip}`)
    .digest("hex");

  const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
  const { count } = await db
    .from("goonj_lead_hits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  // Off in local development, so testing the form never locks you out.
  if ((count ?? 0) >= RATE_LIMIT && process.env.NODE_ENV === "production") return fail("Too many attempts. Please wait a few minutes and try again.");
  await db.from("goonj_lead_hits").insert({ ip_hash: ipHash });

  const partial = mode === "1" && steps.length === 2;
  const { data: row, error } = await db
    .from("goonj_leads")
    .insert({
      campaign_id: campaign.id,
      ...columns,
      data: extra,
      utm_source: clip(str(fd.get("_utm_source")), 100),
      utm_medium: clip(str(fd.get("_utm_medium")), 100),
      utm_campaign: clip(str(fd.get("_utm_campaign")), 100),
      referrer: clip(str(fd.get("_referrer")), 500),
      consent,
      status: partial ? "partial" : "complete",
      completed_at: partial ? null : new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !row) {
    console.error("[goonj] lead insert failed", error?.message);
    return fail("Something went wrong on our side. Please try again.");
  }

  const firstName = data.first_name ?? "";
  if (partial) return { status: "step2", lead: { id: row.id, token: sign(row.id) }, firstName };
  return { status: "success", firstName };
}
