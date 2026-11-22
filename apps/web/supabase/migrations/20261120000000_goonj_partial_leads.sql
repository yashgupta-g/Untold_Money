-- Two-step sign-up form: step 1 (name + email) saves a "partial" lead,
-- step 2 (phone, profile, …) completes it.

alter table public.goonj_leads
  add column if not exists status text not null default 'complete'
    check (status in ('partial', 'complete')),
  add column if not exists completed_at timestamptz;

-- Existing leads were all full sign-ups.
update public.goonj_leads set completed_at = created_at where completed_at is null and status = 'complete';

create index if not exists goonj_leads_status_idx on public.goonj_leads (campaign_id, status);

-- Lead counts for the dashboard list, now with the partial ones split out.
create or replace view public.goonj_campaign_lead_counts
with (security_invoker = true) as
  select
    campaign_id,
    count(*)::int as leads,
    max(created_at) as last_lead_at,
    (count(*) filter (where status = 'partial'))::int as partial
  from public.goonj_leads
  group by campaign_id;
