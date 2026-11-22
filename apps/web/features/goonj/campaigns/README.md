# Goonj campaign pages + dashboard

One page template for every campaign and influencer link, plus a small dashboard
where the campaign team edits them. Built with Next.js (App Router) and Supabase
(Postgres, Auth, Storage).

| URL here | URL on goonj.com | What it is |
|---|---|---|
| `/goonj/limited-release` | `/limited-release` | The default page (the `limited-release` row) |
| `/c/<slug>` | `/c/<slug>` | A campaign or influencer page, e.g. `/c/avika` |
| `/goonj/admin` | `/admin` | Dashboard: campaigns, editor, sign-ups, CSV |

**Per campaign:** the hero, the sign-up form and the points.

**The same on every page:** testimonials, "Goonj gets you" and the footer
(`static.ts`).

## How it works

- **The page** (`page/CampaignPage.tsx`) renders one campaign's content.
  - `data.ts` reads it with the anon key. Row Level Security only returns
    published, in-window, non-deleted rows.
  - In production the read is cached under the tag `goonj-campaign:<slug>`
    for up to 5 minutes. Every dashboard save expires the tag (`updateTag`),
    so edits show up immediately.
- **The form** (`page/SignupForm.tsx` and `actions/submitLead.ts`):
  - It draws its fields from the campaign's settings.
  - The server action checks the fields against the campaign as stored in the
    database, never what the browser sent.
  - It blocks bots with a honeypot field and a minimum fill time, and
    rate-limits each IP to 5 sign-ups per 10 minutes.
  - It saves the sign-up with the UTM tags. Leads can only be written by the
    server, with the service key.
- **The dashboard** (`admin/`):
  - Email and password login, limited to the `goonj_admins` allowlist. Every
    page and server action re-checks this.
  - The editor's live preview is the real template in an iframe, fed unsaved
    edits by `postMessage`.
- **Schema:** `schema.ts` is the single zod schema. The editor, the database
  row and the form rules all use it.

## Local development

```bash
cd apps/web
npx supabase start          # Docker: Postgres, Auth, Storage, Studio (http://127.0.0.1:54323)
npx supabase db reset       # applies supabase/migrations + supabase/seed.sql
```

The keys go in `.env.local`. `npx supabase status` prints them.

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_INTERNAL_URL=http://host.docker.internal:54321   # only when Next runs inside Docker
GOONJ_LEAD_SALT=any-random-string
```

The seed is generated from `defaults.ts`. After changing the default copy, run
`node scripts/goonj-seed.mjs`.

## Adding an editor

Public sign-up is off, so the two campaign editors are added by hand.

1. In Supabase Studio, go to **Authentication → Users → Add user**. Enter their
   email and a password, and tick "Auto confirm".
2. In the **SQL editor**, run:

   ```sql
   insert into public.goonj_admins (user_id, email)
   select id, email from auth.users where email = 'person@goonj.com';
   ```

To remove someone, delete their `goonj_admins` row, or delete the user.

## Deploying (Vercel + hosted Supabase)

1. Create a Supabase project. Use the Mumbai region (`ap-south-1`) for Indian
   visitors.
2. Apply the schema. Either:
   - run `npx supabase link --project-ref <ref>` then `npx supabase db push`, or
   - paste `supabase/migrations/*.sql` into the SQL editor.

   Then run `supabase/seed.sql` once for the default page.
3. In Supabase → **Authentication → Providers → Email**, turn off "Allow new
   users to sign up". Then add the editors as described above.
4. In Vercel → **Project → Settings → Environment Variables**, add these for
   Production and Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret)
   - `GOONJ_LEAD_SALT` (secret)
   - `NEXT_PUBLIC_SITE_URL=https://goonj.com`
   - Leave out `SUPABASE_INTERNAL_URL`.
5. Deploy. Check `/admin/login`, publish a test campaign, submit its form,
   then download the CSV.

## Moving this into the goonj.com repo

These are the pieces to copy:
- `features/goonj/campaigns/`
- `app/c/[slug]/`
- `app/goonj/limited-release/`, which becomes `app/limited-release/`
- `app/goonj/admin/`, which becomes `app/admin/`
- `supabase/`
- `scripts/goonj-seed.mjs`
- `public/goonj/lr/`
- `public/goonj/goonj-logo-script.svg`
- the fonts it imports (`features/goonj/fonts`, `v4/fonts.ts`, `v7/fonts.ts`)
- the `/goonj/admin` session block in `proxy.ts`

Then:
- Search for `/goonj/admin` and `/goonj/limited-release` and drop the `/goonj`
  prefix. They appear in `admin/auth.ts`, `admin/links.ts`, `admin/ui.tsx`,
  `admin/Editor.tsx` and the admin pages.
- Install `@supabase/supabase-js`, `@supabase/ssr` and `zod`.

## Not in v1

- Captcha: add Cloudflare Turnstile in `submitLead.ts` if bots get past the
  honeypot.
- Per-campaign visit counts and conversion rate. Vercel Analytics custom
  events would cover this.
- Email alerts for new sign-ups.
- CRM or Google Sheets sync. The CSV covers this for now.
