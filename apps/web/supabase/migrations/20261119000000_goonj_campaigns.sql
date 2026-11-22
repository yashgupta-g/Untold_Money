-- Goonj campaign pages: campaigns, leads, admins, and the media bucket.
-- Public pages read published campaigns with the anon key. Leads are written
-- on the server with the service role key only, and read by admins.

create extension if not exists pgcrypto;

-- Admins -------------------------------------------------------------------
create table public.goonj_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.goonj_admins enable row level security;

create or replace function public.is_goonj_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.goonj_admins where user_id = auth.uid());
$$;

create policy "admins read admins" on public.goonj_admins
  for select to authenticated using (public.is_goonj_admin());

-- Campaigns ----------------------------------------------------------------
create table public.goonj_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'),
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'influencer' check (kind in ('influencer', 'seasonal', 'default')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_template boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  hero jsonb not null,
  form jsonb not null,
  points jsonb not null,
  seo jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index goonj_campaigns_status_idx on public.goonj_campaigns (status) where deleted_at is null;

create or replace function public.goonj_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger goonj_campaigns_touch
  before update on public.goonj_campaigns
  for each row execute function public.goonj_touch_updated_at();

alter table public.goonj_campaigns enable row level security;

create policy "public reads live campaigns" on public.goonj_campaigns
  for select to anon, authenticated
  using (
    status = 'published'
    and deleted_at is null
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "admins read campaigns" on public.goonj_campaigns
  for select to authenticated using (public.is_goonj_admin());
create policy "admins insert campaigns" on public.goonj_campaigns
  for insert to authenticated with check (public.is_goonj_admin());
create policy "admins update campaigns" on public.goonj_campaigns
  for update to authenticated using (public.is_goonj_admin()) with check (public.is_goonj_admin());
create policy "admins delete campaigns" on public.goonj_campaigns
  for delete to authenticated using (public.is_goonj_admin());

-- Leads --------------------------------------------------------------------
create table public.goonj_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.goonj_campaigns (id) on delete restrict,
  first_name text,
  last_name text,
  email text,
  phone text,
  data jsonb not null default '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

create index goonj_leads_campaign_idx on public.goonj_leads (campaign_id, created_at desc);

alter table public.goonj_leads enable row level security;

-- No insert policy: only the service role (server) writes leads.
create policy "admins read leads" on public.goonj_leads
  for select to authenticated using (public.is_goonj_admin());

-- Rate limiting for the public form (server only) ---------------------------
create table public.goonj_lead_hits (
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index goonj_lead_hits_idx on public.goonj_lead_hits (ip_hash, created_at desc);

alter table public.goonj_lead_hits enable row level security;

-- Lead counts for the dashboard list ---------------------------------------
create or replace view public.goonj_campaign_lead_counts
with (security_invoker = true) as
  select campaign_id, count(*)::int as leads, max(created_at) as last_lead_at
  from public.goonj_leads
  group by campaign_id;

-- Media bucket -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'goonj-media',
  'goonj-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
)
on conflict (id) do nothing;

create policy "admins upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'goonj-media' and public.is_goonj_admin());
create policy "admins update media" on storage.objects
  for update to authenticated
  using (bucket_id = 'goonj-media' and public.is_goonj_admin());
create policy "admins delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'goonj-media' and public.is_goonj_admin());
