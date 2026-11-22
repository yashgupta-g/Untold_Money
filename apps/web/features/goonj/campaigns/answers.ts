import type { CampaignForm } from "./schema";

/**
 * A lead's extra answers (everything beyond name, email and phone), stored in
 * goonj_leads.data.
 *
 * Built-in fields keep their key (profile_link, profile_type, city), since
 * the CSV has fixed columns for them. Custom questions are stored under the
 * question text itself, e.g. {"What do you do?": "Designer"}, so the row is
 * readable in Supabase and survives the question being renamed later.
 * Leads saved before that used the slot key (custom_1…3); those are looked
 * up in the campaign's current form.
 */
export const BUILT_IN_ANSWERS: Record<string, string> = {
  profile_type: "Profile type",
  profile_link: "Profile link",
  city: "City",
};

/** The key a custom answer is stored under: its question, made unique. */
export function answerKey(label: string, fallback: string, taken: Record<string, unknown>) {
  const base = label.replace(/\s+/g, " ").trim().slice(0, 80) || fallback;
  let key = base;
  for (let n = 2; key in taken || key in BUILT_IN_ANSWERS; n++) key = `${base} (${n})`;
  return key;
}

/** Custom answers as [question, answer] pairs, built-ins left out. */
export function customAnswers(
  data: Record<string, unknown> | null | undefined,
  form?: Pick<CampaignForm, "fields">,
): [string, string][] {
  const labels = new Map((form?.fields ?? []).map((f) => [f.key as string, f.label]));
  return Object.entries(data ?? {})
    .filter(([k, v]) => !(k in BUILT_IN_ANSWERS) && v != null && v !== "")
    .map(([k, v]) => [/^custom_\d$/.test(k) ? (labels.get(k) ?? k.replace("_", " ")) : k, String(v)]);
}

/** Every extra answer, built-ins first, for one-line display. */
export function allAnswers(
  data: Record<string, unknown> | null | undefined,
  form?: Pick<CampaignForm, "fields">,
): [string, string][] {
  const d = data ?? {};
  const builtIn = Object.entries(BUILT_IN_ANSWERS)
    .filter(([k]) => d[k] != null && d[k] !== "")
    .map(([k, label]) => [label, String(d[k])] as [string, string]);
  return [...builtIn, ...customAnswers(d, form)];
}
