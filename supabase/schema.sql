-- Journal cloud-sync schema.
-- Run this once in your Supabase project: Dashboard → SQL Editor → paste → Run.
--
-- Design notes:
--  * One row per (user_id, date). The day key IS part of the primary key.
--  * Soft deletes: clearing a day sets `deleted_at` (and text = '') instead of
--    removing the row, so other devices can learn about the deletion on pull.
--  * `updated_at` drives last-write-wins conflict resolution (stamped by the
--    client at write time). One-entry-per-day makes real conflicts rare.

create table if not exists public.entries (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  date       date        not null,
  text       text        not null default '',
  updated_at timestamptz not null,
  deleted_at timestamptz,
  primary key (user_id, date)
);

-- Incremental pull: "give me everything changed since <watermark>".
create index if not exists entries_user_updated_idx
  on public.entries (user_id, updated_at);

-- Row-Level Security: every user can touch only their own rows.
alter table public.entries enable row level security;

drop policy if exists "entries_select_own" on public.entries;
create policy "entries_select_own" on public.entries
  for select using (user_id = auth.uid());

drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own" on public.entries
  for insert with check (user_id = auth.uid());

drop policy if exists "entries_update_own" on public.entries;
create policy "entries_update_own" on public.entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_delete_own" on public.entries
  for delete using (user_id = auth.uid());
