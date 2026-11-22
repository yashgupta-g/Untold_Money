import type { CampaignForm, Hero, PageContent, Points } from "./schema";

/**
 * The default page (goonj.com/limited-release), with the live site's copy.
 * The database row with slug "limited-release" overrides it; this is the
 * fallback when Supabase isn't configured, and the start for "New campaign".
 */

export const DEFAULT_SLUG = "limited-release";

export const DEFAULT_HERO: Hero = {
  badge: "Welcome to Goonj",
  title: "Be one of the first. Join something special.",
  titleAccent: "Join something special.",
  subtitle: "A personal space for professionals to unlock their true potential.",
  bullets: [
    "No complicated learning. Just conversations.",
    "No big commitment. Just small moments.",
    "No waiting months. Just days to make progress.",
  ],
  ctaLabel: "Get Early Access",
  trustLine: "Start Free. Leave Anytime. Always Private.",
  media: { type: "image", url: "/goonj/lr/aarya.webp", alt: "Aarya, a Goonj AI mentor" },
};

export const DEFAULT_FORM: CampaignForm = {
  title: "Experience Goonj before the world does",
  subtitle: "Fill in your details to get early access.",
  continueLabel: "Count me in",
  submitLabel: "Request Early Access",
  twoStep: true,
  successTitle: "Thanks, {first_name}!",
  successBody:
    "Thank you for your submission. You have been added to our waiting list. If you are selected for the limited release, we will be in touch with further details.",
  fields: [
    { key: "first_name", label: "First name", type: "text", required: true },
    { key: "last_name", label: "Last name", type: "text", required: true },
    { key: "email", label: "Email address", type: "email", required: true },
    { key: "phone", label: "Phone", type: "tel", required: true },
    { key: "profile_link", label: "Your profile", type: "url", required: false, placeholder: "Paste your profile link" },
  ],
};

export const DEFAULT_POINTS: Points = {
  eyebrow: "Limited release",
  title: "Early ⬩ Involved ⬩ Valued",
  image: { type: "image", url: "/goonj/lr/aarya.webp", alt: "Aarya, a Goonj AI mentor" },
  items: [
    {
      title: "You Are One Of The Few",
      body: "Goonj isn't open to everyone yet. You are part of a special group invited to experience it first.",
    },
    {
      title: "You Are Here For A Reason",
      body: "We believe your perspective, experiences, and way of seeing things can bring something meaningful to Goonj.",
    },
    {
      title: "You Get To Discover It Early",
      body: "You will experience Goonj while it's still new, before it becomes available to a much larger audience.",
    },
    {
      title: "Your Feedback Matters More",
      body: "Your honest reactions will help us understand what feels useful, what feels natural, and what needs improvement.",
    },
    {
      title: "You Are Closer To The Team",
      body: "As an early user, you will have a more direct connection with the people building Goonj and the work happening behind it.",
    },
    {
      title: "You Are Part Of What Comes Next",
      body: "Your experience can help us understand what people need, what works, and what deserves more attention as Goonj grows.",
    },
  ],
};

export const DEFAULT_PAGE: PageContent = {
  slug: DEFAULT_SLUG,
  hero: DEFAULT_HERO,
  form: DEFAULT_FORM,
  points: DEFAULT_POINTS,
  seo: {
    title: "Goonj AI - Get Early Access Before Our Public Launch",
    description: "A personal space for professionals to unlock their true potential. Join the Goonj limited release.",
  },
};

/** Fields the form builder can add, with sensible defaults. */
export const FIELD_LIBRARY = [
  { key: "first_name", label: "First name", type: "text" },
  { key: "last_name", label: "Last name", type: "text" },
  { key: "full_name", label: "Full name", type: "text" },
  { key: "email", label: "Email address", type: "email" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "city", label: "City", type: "text" },
  { key: "profile_link", label: "Your profile", type: "url" },
  { key: "custom_1", label: "Custom question 1", type: "text" },
  { key: "custom_2", label: "Custom question 2", type: "text" },
  { key: "custom_3", label: "Custom question 3", type: "text" },
] as const;
