-- OvO Web: online custom levels
-- Run once in Supabase → SQL Editor. (Multiplayer uses Realtime broadcast and needs no tables.)

create table if not exists public.levels (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 40),
  author      text not null default '' check (char_length(author) <= 30),
  description text not null default '' check (char_length(description) <= 200),
  data        jsonb not null check (jsonb_typeof(data) = 'object' and jsonb_typeof(data->'objs') = 'array' and octet_length(data::text) <= 300000),
  plays       integer not null default 0,
  likes       integer not null default 0,
  hidden      boolean not null default false   -- set true in the dashboard to take a level down
);

create index if not exists levels_created_at_idx on public.levels (created_at desc);
create index if not exists levels_likes_idx on public.levels (likes desc);

alter table public.levels enable row level security;

drop policy if exists "levels are public" on public.levels;
create policy "levels are public" on public.levels
  for select to anon, authenticated using (hidden = false);

drop policy if exists "anyone can upload" on public.levels;
create policy "anyone can upload" on public.levels
  for insert to anon, authenticated with check (hidden = false and plays = 0 and likes = 0);

grant select, insert on public.levels to anon, authenticated;

create or replace function public.level_played(level_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.levels set plays = plays + 1 where id = level_id and hidden = false;
$$;

create or replace function public.level_liked(level_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.levels set likes = likes + 1 where id = level_id and hidden = false;
$$;

revoke all on function public.level_played(uuid) from public;
revoke all on function public.level_liked(uuid) from public;
grant execute on function public.level_played(uuid) to anon, authenticated;
grant execute on function public.level_liked(uuid) to anon, authenticated;
