create extension if not exists pgcrypto;

create table if not exists public.invitation_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source_url text,
  attendance_status text not null check (attendance_status in ('attend', 'absent')),
  telephone text not null,
  email text not null,
  allergy_note text default 'なし',
  companions jsonb not null default '[]'::jsonb,
  message_image_url text default 'なし',
  save_info boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  bus_use text not null default '記入なし',
  stay_0710 text not null default '記入なし',
  guest_name text not null default ''
);

create index if not exists invitation_responses_created_at_idx
  on public.invitation_responses (created_at desc);

create index if not exists invitation_responses_email_idx
  on public.invitation_responses (email);

alter table public.invitation_responses enable row level security;

drop policy if exists "Allow anon insert invitation responses" on public.invitation_responses;
create policy "Allow anon insert invitation responses"
  on public.invitation_responses
  for insert
  to anon
  with check (true);

drop policy if exists "Allow authenticated insert invitation responses" on public.invitation_responses;
create policy "Allow authenticated insert invitation responses"
  on public.invitation_responses
  for insert
  to authenticated
  with check (true);

grant usage on schema public to anon, authenticated;
grant insert on table public.invitation_responses to anon, authenticated;
grant select on table public.invitation_responses to authenticated;
