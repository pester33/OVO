-- OvO Web: community Game Mods
-- Run this once in Supabase → SQL Editor (project fowocvidnvzlxuanslmx).

create table if not exists public.mods (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 40),
  author      text not null default '' check (char_length(author) <= 30),
  description text not null default '' check (char_length(description) <= 300),
  version     text not null default '1.0' check (char_length(version) <= 12),
  data        jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 200000),
  downloads   integer not null default 0,
  hidden      boolean not null default false   -- set to true in the dashboard to take a mod down
);

create index if not exists mods_created_at_idx on public.mods (created_at desc);

alter table public.mods enable row level security;

-- Everyone can browse mods that aren't hidden
drop policy if exists "mods are public" on public.mods;
create policy "mods are public" on public.mods
  for select to anon, authenticated
  using (hidden = false);

-- Anyone can publish a new mod, but can't pre-hide it or fake download counts
drop policy if exists "anyone can publish" on public.mods;
create policy "anyone can publish" on public.mods
  for insert to anon, authenticated
  with check (hidden = false and downloads = 0);

-- No update/delete policies: only you (dashboard / service role) can edit or remove mods.

grant select, insert on public.mods to anon, authenticated;

-- Download counter that players can call without being able to edit rows
create or replace function public.mod_downloaded(mod_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.mods set downloads = downloads + 1 where id = mod_id and hidden = false;
$$;

revoke all on function public.mod_downloaded(uuid) from public;
grant execute on function public.mod_downloaded(uuid) to anon, authenticated;
