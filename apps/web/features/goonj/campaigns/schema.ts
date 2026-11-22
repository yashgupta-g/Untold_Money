import { z } from "zod";

/**
 * The shape of a campaign page. One schema validates the dashboard editor,
 * the database row and the public form, so they can never drift apart.
 * Only the hero, the form and the points are per campaign; everything else
 * on the page is static (see static.ts).
 */

const text = (max: number) => z.string().trim().max(max);
const required = (max: number, label: string) => text(max).min(1, `${label} is required`);

export const mediaSchema = z.object({
  type: z.enum(["image", "video"]),
  url: required(600, "Media"),
  poster: text(600).optional(),
  alt: text(200).default(""),
});

export const heroSchema = z.object({
  badge: text(60).optional(),
  title: required(140, "Heading"),
  /** Words inside the title to colour orange. Must appear in the title. */
  titleAccent: text(80).optional(),
  subtitle: text(280).default(""),
  bullets: z.array(required(90, "Bullet")).max(4).default([]),
  ctaLabel: required(40, "Button text"),
  trustLine: text(90).default(""),
  media: mediaSchema,
  creator: z
    .object({ name: required(60, "Creator name"), handle: text(60).optional() })
    .optional(),
});

export const FIELD_KEYS = [
  "first_name",
  "last_name",
  "full_name",
  "email",
  "phone",
  "city",
  "profile_link",
  "custom_1",
  "custom_2",
  "custom_3",
] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELD_TYPES = ["text", "email", "tel", "url", "select", "textarea"] as const;

export const fieldSchema = z.object({
  key: z.enum(FIELD_KEYS),
  label: required(60, "Label"),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  placeholder: text(80).optional(),
  options: z.array(required(60, "Option")).max(12).optional(),
});
export type FormField = z.infer<typeof fieldSchema>;

export const formSchema = z
  .object({
    title: required(120, "Form heading"),
    subtitle: text(200).default(""),
    /** Step 1's button, when the form is in two steps. */
    continueLabel: text(30).default("Count me in"),
    submitLabel: required(40, "Button text"),
    /** "{first_name}" is replaced with what the visitor typed. */
    successTitle: required(80, "Success heading"),
    successBody: text(400).default(""),
    fields: z.array(fieldSchema).min(1, "Add at least one field").max(10),
    /** Ask for name + email first, then the rest. See formSteps(). */
    twoStep: z.boolean().default(true),
  })
  .superRefine((form, ctx) => {
    const keys = form.fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({ code: "custom", path: ["fields"], message: "Each field can only be used once" });
    }
    if (!keys.includes("email") && !keys.includes("phone")) {
      ctx.addIssue({ code: "custom", path: ["fields"], message: "Collect at least an email or a phone number" });
    }
    for (const [i, f] of form.fields.entries()) {
      if (f.type === "select" && !(f.options && f.options.length)) {
        ctx.addIssue({ code: "custom", path: ["fields", i, "options"], message: "Add options for this dropdown" });
      }
    }
  });

export const pointsSchema = z.object({
  eyebrow: text(60).default(""),
  title: required(120, "Points heading"),
  image: mediaSchema.optional(),
  items: z
    .array(z.object({ title: required(80, "Point title"), body: text(220).default("") }))
    .min(1, "Add at least one point")
    .max(8),
});

export const seoSchema = z.object({
  title: text(70).optional(),
  description: text(200).optional(),
  ogImage: text(600).optional(),
});

export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;
export const RESERVED_SLUGS = ["admin", "api", "new", "preview"];

export const KINDS = ["influencer", "seasonal", "default"] as const;
export const STATUSES = ["draft", "published", "archived"] as const;

/** Everything the editor sends when saving. */
export const campaignInputSchema = z.object({
  name: required(120, "Name"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_RE, "Use 2–40 lowercase letters, numbers or dashes")
    .refine((s) => !RESERVED_SLUGS.includes(s), "That link is reserved"),
  kind: z.enum(KINDS),
  isTemplate: z.boolean().default(false),
  startsAt: z.string().datetime({ offset: true }).nullable().default(null),
  endsAt: z.string().datetime({ offset: true }).nullable().default(null),
  hero: heroSchema,
  form: formSchema,
  points: pointsSchema,
  seo: seoSchema.default({}),
});

export type Media = z.infer<typeof mediaSchema>;
export type Hero = z.infer<typeof heroSchema>;
export type CampaignForm = z.infer<typeof formSchema>;
export type Points = z.infer<typeof pointsSchema>;
export type Seo = z.infer<typeof seoSchema>;
export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type Kind = (typeof KINDS)[number];
export type Status = (typeof STATUSES)[number];

/** The parts of a campaign the public page renders. */
export type PageContent = { slug: string; hero: Hero; form: CampaignForm; points: Points; seo: Seo };

/** A campaign row as the dashboard sees it. */
export type Campaign = PageContent & {
  id: string;
  name: string;
  kind: Kind;
  status: Status;
  isTemplate: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// Public form validation -----------------------------------------------------

const STEP_ONE: FieldKey[] = ["first_name", "last_name", "full_name", "email"];

/**
 * Splits a form into the steps the visitor sees. Two-step forms ask for the
 * name and email first (saved as a partial lead), then everything else.
 * Short forms (3 fields or fewer) and forms with nothing left for step 2
 * stay a single step.
 */
export function formSteps(form: Pick<CampaignForm, "fields" | "twoStep">): FormField[][] {
  const { fields } = form;
  if (!form.twoStep || fields.length <= 3) return [fields];
  let one = fields.filter((f) => STEP_ONE.includes(f.key));
  if (!one.some((f) => f.key === "email")) {
    const phone = fields.find((f) => f.key === "phone");
    if (!phone) return [fields];
    one = fields.filter((f) => STEP_ONE.includes(f.key) || f.key === "phone");
  }
  const two = fields.filter((f) => !one.includes(f));
  return two.length ? [one, two] : [fields];
}

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/** Normalises "+91 98765-43210" / "098765 43210" style input to digits. */
export function cleanPhone(raw: string, country: string) {
  const digits = raw.replace(/\D/g, "");
  if (country === "+91") return digits.replace(/^(91|0)(?=\d{10}$)/, "");
  return digits;
}

/**
 * Builds the rules for one campaign's form from its stored field list, so
 * the server checks exactly the fields the dashboard configured.
 */
export function leadSchemaFor(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let rule: z.ZodTypeAny;
    const base = z.string().trim().max(f.type === "textarea" ? 1000 : 200);
    const blank = (s: string) => s === "";
    switch (f.type) {
      case "email":
        rule = base.toLowerCase().refine((s) => blank(s) || z.email().safeParse(s).success, "Enter a valid email");
        break;
      case "url":
        rule = base.refine(
          (s) => blank(s) || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(s),
          "Enter a valid link",
        );
        break;
      case "select":
        rule = base.refine((s) => blank(s) || (f.options ?? []).includes(s), "Choose one of the options");
        break;
      default:
        rule = base;
    }
    shape[f.key] = f.required ? rule.refine((s) => !blank(s as string), `${f.label} is required`) : rule;
  }
  return z.object(shape);
}

export function validPhone(digits: string, country: string) {
  return country === "+91" ? INDIAN_MOBILE.test(digits) : digits.length >= 6 && digits.length <= 15;
}
