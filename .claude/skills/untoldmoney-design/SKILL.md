---
name: untoldmoney-design
description: UntoldMoney's UI/UX design system: theme, tokens, component patterns, motion and taste. Use BEFORE any visual or UX change in apps/web, whether that's a new page, section, component, restyle, layout fix, icon, form, dashboard screen or auth screen, and whenever the user says "improve the design", "make it look like the product", "fix the UI" or similar, so the result matches the existing brand without the user having to re-explain it.
---

# UntoldMoney design system

UntoldMoney is an AI-powered personal finance workspace for Indian retail
investors and traders (NSE). It brings together market data, AI stock
analysis, capital allocation, broker trading, backtesting, an AI analyst and
a trade journal. The design should feel **calm, premium and editorial**, like
an Apple product page crossed with a modern fintech tool. It is **not** a
neon trading terminal, a gamified app or a generic shadcn admin template.

The user expects every change to match this taste without being told. Read
this file, then look at the closest existing screen, then build.

## 1. Where the source of truth lives

| What | File |
|---|---|
| Brand tokens (only place raw colours live) | `apps/web/features/landing/tokens.module.css` |
| Shared marketing primitives (`btn`, `eyebrow`, `h2`, `container`, `chip`, `card`, `logo`) | `apps/web/features/landing/landing.module.css` |
| Motion vocabulary (`REVEAL`, `STAGGER`, `MQ_*`) | `apps/web/features/landing/motion.ts` |
| Page-wide motion (Lenis, reveals, heading blur-in) | `apps/web/features/landing/components/LandingMotion.tsx` |
| Copy and data for the landing (`POSITIONING`, `PLATFORM`, `REEL`, `MEDIA`, `NAV_LINKS`) | `apps/web/features/landing/content.ts` |
| Auth pages (split layout, form styles) | `apps/web/features/auth/` (`AuthShell`, `RegisterForm`, `LoginForm`, `auth.module.css`) |
| App/dashboard theme (Tailwind + shadcn tokens mapped to the brand) | `apps/web/app/globals.css` |
| App shell | `apps/web/components/layout/sidebar.tsx`, `topbar.tsx`, `app/(dashboard)/layout.tsx` |
| Shared app primitives (already restyled) | `apps/web/components/ui/*` |
| Icon defaults | `apps/web/app/providers.tsx` (Phosphor, `weight: "regular"`) |

The project has two styling systems, and both must look like the same brand:
- **Landing + auth:** CSS Modules that read the tokens via `var(--…)`. Wrap
  a page in `tokens.theme` + `shared.page` to get the tokens and type.
- **Dashboard:** Tailwind v4 + shadcn primitives. `globals.css` maps the
  brand onto shadcn tokens. Use the semantic classes (`bg-card`,
  `text-muted-foreground`, `text-primary-ink`…), never raw hex values in
  JSX.

Before you invent anything, reuse an existing class, token or component.

## 2. Colour: what each role means

| Role | Token (landing) | Tailwind (app) | Value | Use for |
|---|---|---|---|---|
| Page | `--bg` | `bg-background` (app canvas is `#f7f7f9`) | `#ffffff` | Backgrounds |
| Subtle surface | `--bg-subtle` | `bg-muted` | `#f5f5f7` | Banded sections, hover rows |
| Muted | `--bg-muted` | `bg-secondary` | `#ebebef` | Chips, tracks, segmented controls |
| Card | `--bg-elev` | `bg-card` | `#ffffff` | Floating panels and cards |
| Ink | `--ink` | `text-foreground`, `bg-primary` | `#0b0b0c` | Headings, **primary buttons** |
| Body | `--ink-2` | — | `#3b3b40` | Paragraphs |
| Label | `--ink-3` | `text-muted-foreground` | `#68686f` | Labels, meta |
| Placeholder | `--ink-4` | — | `#a6a6ad` | Placeholders, disabled |
| Hairline | `--line` / `--line-strong` | `border-border` / `border-input` | 8% / 14% ink | Every border |
| **Accent (cobalt)** | `--accent` / `--accent-soft` | `text-primary-ink`, `bg-accent text-accent-foreground`, `ring-ring` | `#2e4bf5` / `#e9edff` | Active state, focus ring, key links, progress, one dot |
| Gain | `--gain`, `--gain-ink`, `--gain-soft` | `text-profit`, `text-chart-2` | `#0f9d6b` / `#0b7a53` | **Market data only** |
| Loss | `--loss`, `--loss-ink`, `--loss-soft` | `text-loss`, `text-destructive` | `#e0484d` / `#b42a30` | Market data, errors |
| Warn | `--warn*` | `text-warning` | `#d9772e` | Warnings |

Rules:
- **One accent, used sparingly.** Cobalt marks the one thing that matters:
  the active nav icon, a focus ring, a progress bar, the eyebrow dot. Never
  make big cobalt fills, cobalt headings or several cobalt elements fighting.
- **Primary actions are ink, not cobalt.** Black pill with white text.
- **Green and red mean money going up or down.** Never use them for
  decoration, success banners or brand colour. Errors may use `loss-ink` on
  `loss-soft`.
- The old green `#0d9958` theme is gone. Never reintroduce it.
- Dark glow panels (`--dk-*`, `.darkPanel`) exist for occasional dramatic
  landing sections only. The product UI is light.
- Shadows are layered, neutral and never coloured: `--shadow-sm`, `-md`,
  `-lg`.

## 3. Type

- Family: `"SF Pro Display", -apple-system, …, Inter`. Inter is loaded via
  `next/font` as the fallback. An italic serif (`--font-serif`, Instrument
  Serif) is available for rare editorial accents only.
- Headings are **medium weight (500), never bold**, with tight negative
  tracking:
  - Hero `--fs-hero` (48–104px), `letter-spacing: -0.035em`, line-height ~1.02
  - Section `--fs-h2` (36–64px), `-0.035em`
  - Page title in the app: `text-[32px] font-medium leading-tight tracking-[-0.035em]`
  - Card title: ~17–26px, 500, `-0.01em` to `-0.02em`
- Body 16px, line-height 1.55–1.6, `--ink-2`. Lede `--fs-body-lg`.
- Labels 13px, weight 500, `--ink-3`, **sentence case**, never
  UPPERCASE + wide tracking.
- Numbers use `tabular-nums` (it's set globally). Show money as `₹` with
  Indian grouping (`₹12,45,680`).
- `text-wrap: balance` on headings, `pretty` on paragraphs.

## 4. Shape and spacing

- Radius: `--r-sm` 10px (inputs), `--r-md` 16px, `--r-lg` 24px (cards and
  glass cards), `--r-xl` 32px (hero and photo panels), `--r-pill` (buttons,
  chips, badges, search, tabs). In the app: inputs `rounded-xl`, cards
  `rounded-2xl`, buttons, badges and tabs `rounded-full`.
- **No square corners anywhere.**
- Layout: `--maxw` 1240px content, `--gutter` `clamp(16px, 4vw, 40px)`,
  section padding `--section`. The app's content is capped at 1440px with
  `px-6 lg:px-8 py-8`.
- Use generous whitespace. Separate things with space and hairlines before
  you reach for boxes.

## 5. Component patterns (copy these)

**Buttons**
- Primary: `shared.btn shared.btnPrimary`, a 52px ink pill. CTAs add an
  arrow disc: `<span className={shared.btnArrow}><ArrowUpRight weight="bold"/></span>`.
  Hover lifts 1px with `--shadow-md`.
- Secondary: `shared.btnSecondary`, a white pill with a `--line-strong`
  border.
- Small: `shared.btnSm` (40px). In the app use `<Button>` (pill, ink).
  `variant="outline"` gives a white pill with a hairline.
- Over a photo: glass (`--glass` background, `--glass-line` border,
  `backdrop-filter: blur(14px)`, white text).

**Eyebrow chip** (above almost every heading): `shared.eyebrow`, a white
pill with a hairline border, 13px `--ink-3` text and a 6px cobalt dot.

**Cards**
- Landing: `shared.card` is `--bg-subtle` with `--r-xl`.
- App: `<Card>` is white `rounded-2xl` with `ring-1 ring-foreground/[0.07]`
  and a soft shadow. Interactive cards lift: `hover:-translate-y-0.5
  hover:shadow-md`.

**Inputs**
- 44–50px tall, `--r-sm`/`rounded-xl`, white, `--line-strong` border and
  `--shadow-sm`.
- Focus: border `--accent` plus a `0 0 0 4px var(--accent-soft)` ring.
- Invalid: border `--loss`, message 13px `--loss-ink`.
- The label sits above the field (14px, 500, ink). Mark optional fields
  with a right-aligned "Optional" in `--ink-4`.

**Chips and badges**: pills. Status chips use `bg-accent
text-accent-foreground` (active/open) or `bg-muted text-muted-foreground`
(closed/neutral). Use `chipGain`/`chipLoss` for price moves only.

**Tabs and segmented controls**: a pill track (`bg-muted`, `rounded-full`,
`p-1`). The active segment is a white pill with a soft shadow.

**Icons**
- Phosphor (`@phosphor-icons/react`). The default weight is `regular`.
- **Icons never get a background tile, tinted circle, bordered box or
  duotone fill.** Place a bare icon next to text, coloured `text-primary-ink`
  when it's a key icon and `text-muted-foreground` otherwise.
- Use `weight="fill"` only for the active nav item. Use `weight="bold"` for
  small arrows in CTAs.
- Icon-only buttons are ghost and transparent with an `aria-label`. Never
  rely on the browser's default button background; set `bg-transparent`.

**Logo**: `features/landing/components/Logo` (landing and auth), or
`LogoMark` from `components/layout/sidebar.tsx` (app). It's a 30px ink tile
with a 9px radius and two white strokes, beside "UntoldMoney" at 18px, 500,
`-0.02em`.

**Navigation**
- Landing nav: fixed, transparent (no frosted bar), with a centre pill of
  links and an outlined "Log in" pill beside the ink "Get started" pill.
- App sidebar: white with a hairline right border. Items are rounded-xl
  40px rows. The active row is a `bg-muted` pill with ink text and a filled
  cobalt icon. Section labels read "Workspace" and "System" in sentence
  case.
- Topbar: frosted (`bg-background/80 backdrop-blur-xl`) with a pill search
  field and a ⌘K hint.

**Auth (register/login)**: `AuthShell` gives a split screen. The form sits
on white on the left (420px max). On the right is an inset photo panel
(`--r-xl`) with a scrim, a glass chip and the hero line "Your money, with an
AI team behind it." The layout is locked to the viewport on wide screens;
the form column scrolls if it has to. Under 1024px only the form shows.
Keep forms short: one consent checkbox covering both consents, and the
password checklist only while it's unmet.

**Photography**: real, warm, natural scenes (`/public/landing/photos`,
`/heroes`, `/people`). Use a dark gradient scrim (`--scrim`,
`--scrim-strong`) wherever text sits on a photo, with white text on top.

## 6. Motion

- Use GSAP + ScrollTrigger and Lenis smooth scroll (landing). Spring values
  live in `SPRING` (`motion.ts`).
- Default reveal: fade plus a 12px rise, 600ms, `cubic-bezier(.2,.8,.2,1)`,
  stagger 0.06s. Add `data-reveal` to an element to opt in. Section `h2`s
  blur in word by word automatically.
- Pinned or scrubbed effects use `scrub: 0.6`, `invalidateOnRefresh: true`,
  and set `data-pinned` on the section so CSS can switch layout. They run
  only under `MQ_DESKTOP_MOTION` (≥1024px, motion allowed). Phones and
  reduced motion get a plain, usable fallback, such as a swipeable
  snap row.
- Only `transform` and `opacity` animate on scroll. UI micro-transitions use
  `--dur-micro` (200ms).
- **Keep motion purposeful and quiet.** The user removed the WebGL card
  bending and ripple effects. Prefer clean scroll-driven movement over
  distortion, gimmicks or shader effects.
- Always respect `prefers-reduced-motion`.

## 7. UX rules

- Every screen must work at about 400px wide. Collapse grids, hide
  decoration (not content) on small screens, and keep a 16px minimum
  gutter.
- Fit to the viewport where it matters (auth, hero). Use `100svh`, and
  shrink with `clamp(…, vh, …)` and `max-height` media queries before you
  let the page scroll.
- Forms:
  - `autoComplete`, `inputMode` and `type` on every field.
  - Validate on touch.
  - Inline errors linked with `aria-describedby`.
  - Show server errors inline (`role="alert"`) as well as in a toast.
  - Loading button shows a spinner plus an "-ing" label, and is disabled.
- Accessibility: visible cobalt focus rings, `aria-label` on icon-only
  controls, `aria-current="page"` in nav, and text contrast of at least
  4.5:1 (the tokens are already tuned for this).
- Copy:
  - Short, plain and confident, in sentence case.
  - No exclamation marks or hype.
  - "Log in" / "Create account", not "Sign In" / "Create Account".
  - Never invent features, numbers or testimonials. Pull product facts from
    `content.ts`.
  - Mark sample data as sample.
  - Add "Not investment advice." where it fits.
- Don't link to routes that don't exist (Terms, Privacy and Forgot
  password aren't built yet). Use plain text until they are.

## 8. Never do

- Bold (700) headings, UPPERCASE tracked labels, square corners, or the old
  green theme.
- Background tiles or tinted boxes behind icons, duotone icons, grey default
  button backgrounds.
- Several accent colours, coloured shadows, gradients as decoration (except
  photo scrims and the dark glow panels).
- Green or red for anything that isn't market data or an error.
- Raw hex values in components. Add a token to `tokens.module.css` (landing)
  or `globals.css` (app) instead.
- Heavy, gimmicky or distorting animation.
- Redesigning something the user didn't ask about. Change only what was
  requested, in this style.

## 9. Working method

1. Find the nearest existing screen or component and read its code and CSS.
2. Reuse tokens, shared classes and `components/ui` before writing new CSS.
3. Build the change. Check it at about 400px, at 1440px and on a short
   laptop window (about 800px tall), and check reduced motion.
4. Verify the dev server compiles. Inside Docker that's
   `docker exec untoldmoney-web npx tsc --noEmit -p .` plus a `curl` of the
   route. The host's `node_modules` may be stale, so type-check in the
   container.
5. In the reply, say in a line how the change fits this system.
