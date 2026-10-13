# Punk OS — Your Virtualized Brain

**Punk OS turns everything you think, plan, remember, and do into one connected personal
system — an operating system for your mind.** It captures *what happened*, *what you're
thinking*, *what matters*, and *what you should do next*.

The whole point is **integration**: a note, journal entry, task, reminder, calendar event,
and goal shouldn't feel like separate objects in separate apps. They're facets of one
connected brain, cross-surfaced wherever they're relevant and organized around days.

It's a single-owner, local-first **PWA** — install it to your iPhone home screen or Mac
dock — that syncs across your own devices. Works fully offline.

> The app currently ships branded as **"Punk Records."** "Punk OS" is the product vision;
> a UI rename is a separate change.

## What's inside

A persistent **brain button** opens the **hub**: a stylized brain with tappable **lobes**
(sections) plus a daily-reminders quick list. Sections are self-registering modules.

- **Archives** — the journal + calendar. One plain-text entry per day in a smooth, windowed
  day-scroll (lands on today) and a vertical-months calendar. Days are just prose: completed
  to-dos and logged milestones fold into that day's entry as text lines (`✓ …` / `🏅 …`).
- **Scratch** — freeform, iOS-Notes-style notes.
- **To-do** — checkbox-only tasks grouped into free-form **categories** (drag across
  categories to recategorize, drag to reorder). A checked task stays struck-through on the
  board until day's end, then folds into that day's journal entry and leaves the list.
- **Tracker** — personal records / benchmarks (free-form value + unit, grouped by category).
  Updating a value can log a milestone. A pinned **Protein card** tracks a running daily
  total vs. an editable goal and folds into the day's entry as a `🍗 N g protein` line.
- **Daily Reminders** — a recurring-habit checklist with a daily reset and a miss-streak count.

**Integration already live:** days aggregate as text — completed to-dos and logged
milestones fold into that day's journal entry (`✓ …` / `🏅 …`), so Archives is a running
log of what you did alongside what you wrote; the calendar dots journal days (accent) and
milestone days (gold).

## Tech stack

- [Svelte 5](https://svelte.dev) (runes) + [Vite](https://vitejs.dev) + TypeScript (strict)
- [IndexedDB](https://developer.mozilla.org/docs/Web/API/IndexedDB_API) via [`idb`] for local-first storage
- [Supabase](https://supabase.com) (Postgres + Auth + RLS) for cross-device sync (last-write-wins)
- [`vite-plugin-pwa`] (installable PWA), hand-rolled pointer drag-sort (`src/lib/dnd/sortable.ts`), [Vitest] + `fake-indexeddb` (tests)

[`idb`]: https://github.com/jakearchibald/idb
[`vite-plugin-pwa`]: https://vite-pwa-org.netlify.app
[Vitest]: https://vitest.dev

## Getting started

```bash
npm install
npm run dev        # local dev server
```

The app runs **local-only** with no configuration (data stays in IndexedDB on that device).

### Cloud sync (optional)

To sync across devices, point it at a Supabase project:

1. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
   (The anon key is public by design; row-level security protects data. `.env` is gitignored.)
2. In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) once. It
   creates the `entries` table (journal) and a generic `docs` table that backs every other
   collection — so **new object types need no schema change**.

See [`SETUP-SYNC.md`](SETUP-SYNC.md) for the full walkthrough.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run test` | Run the Vitest suite |
| `npm run typecheck` | `tsc` + `svelte-check` |
| `npm run icons` | Regenerate app icons from `assets/` |

## Architecture

- **Section registry** (`src/lib/sections/`, `src/sections/<id>/`) — a section is a
  self-contained `SectionModule`; adding one is essentially a one-line registry addition.
- **Generic sync** (`src/lib/sync/collection.ts`) — `createCollection<T>` gives any
  `{ id, updatedAt }` record a local IndexedDB store + outbox + LWW cloud sync, all over the
  single generic `docs` table. The original journal `entries` keeps its own bespoke stack.
- **Local-first** — IndexedDB is authoritative; writes queue in an outbox and reconcile with
  Supabase. Offline-capable; `navigator.storage.persist()` requests durable storage.
- **Windowed day-scroll** (`src/components/DayScroll.svelte`, `src/lib/scroll/`) —
  hand-rolled virtualization with bidirectional scroll-anchoring for a smooth iPhone feel.

```
src/
  components/     shared UI (DayScroll, DayRow, checklists, hub, calendar, …)
  sections/       one folder per brain-hub section (archives, scratch, todo, tracker)
  lib/
    sections/     section registry + types (the extensibility seam)
    sync/         generic collection sync, Supabase client, merge/engine
    todos/ notes/ reminders/ tracker/ milestones/   per-object models
    db/ date/ scroll/ entries/ markdown/            journal + utilities
  styles/global.css   design tokens (CSS custom properties)
```

## Deployment

Pushing to `main` triggers a [Vercel](https://vercel.com) build (`npm run build` → `dist/`)
and deploy automatically. [Netlify](https://netlify.com) still builds from `main` in
parallel as a fallback. See [`DEPLOY.md`](DEPLOY.md).

## Status

Personal project, single owner. Not accepting external contributions or issues.
