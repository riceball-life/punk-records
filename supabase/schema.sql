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

-- ---------------------------------------------------------------------------
-- Generic document store for the brain-hub sections (reminders, scratch notes,
-- to-dos, and any future section like a tracker).
--
-- Design notes:
--  * One row per (user_id, collection, id). `collection` discriminates which
--    section a row belongs to ('reminders' | 'notes' | 'todos' | ...), so a NEW
--    section needs NO schema change — just a new `collection` value from code.
--  * The record payload lives in `data` (jsonb). This app is single-user and
--    local-first: we never query by payload server-side, only sync by
--    `updated_at` (last-write-wins), so an opaque blob is exactly right.
--  * Soft deletes via `deleted_at` (+ empty `data`) so other devices learn about
--    deletions on pull, mirroring the entries table.
-- ---------------------------------------------------------------------------
create table if not exists public.docs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  collection text        not null,
  id         text        not null,
  data       jsonb       not null default '{}',
  updated_at timestamptz not null,
  deleted_at timestamptz,
  primary key (user_id, collection, id)
);

-- Incremental pull per collection: "everything in <collection> changed since <watermark>".
create index if not exists docs_user_collection_updated_idx
  on public.docs (user_id, collection, updated_at);

alter table public.docs enable row level security;

drop policy if exists "docs_select_own" on public.docs;
create policy "docs_select_own" on public.docs
  for select using (user_id = auth.uid());

drop policy if exists "docs_insert_own" on public.docs;
create policy "docs_insert_own" on public.docs
  for insert with check (user_id = auth.uid());

drop policy if exists "docs_update_own" on public.docs;
create policy "docs_update_own" on public.docs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "docs_delete_own" on public.docs;
create policy "docs_delete_own" on public.docs
  for delete using (user_id = auth.uid());
