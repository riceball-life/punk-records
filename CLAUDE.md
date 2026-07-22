# CLAUDE.md — Punk OS (Your Virtualized Brain)

## The vision (read this first)
**Punk OS turns everything you think, plan, remember, and do into one connected personal
system — an operating system for your mind.** It captures *what happened*, *what you're
thinking*, *what matters*, and *what you should do next*.

The whole point is **integration**. A note, journal entry, task, reminder, calendar event,
and goal should **not** feel like separate objects living in separate apps. They are facets
of one connected brain: the same underlying "things," cross-surfaced wherever they're
relevant, organized largely around *days* (what happened / what's next) and *meaning* (what
matters). When you add a new kind of object, the job is to **connect it to the others**, not
to give it its own silo.

Single owner, single brain. It's a personal PWA — installable on the iPhone home screen and
the Mac dock — synced across the owner's own devices. No multi-user, no social. (The sync
layer is auth-gated so multi-user *could* come later, but that is not the product.)

> Note: the shipping UI still brands as **"Punk Records"** (app title, PWA manifest, export
> filenames). Treat "Punk OS" as the product vision/name; a UI rebrand is a separate task —
> ask before changing user-facing branding.

## How it's organized today — the brain hub
A persistent **brain button** at the bottom of every screen opens the **hub**: an angular,
geometric **virtual brain** (the `InteractiveBrainHub` widget) split into four tappable
**quarters** (sections) plus a **Daily Reminders** quick list. Tapping a quarter opens that
section. Sections are **self-registering modules** — this is the core extensibility seam
(see Architecture). Every section header (and the hub) also carries a **calendar toggle**
icon top-left that jumps straight to the Archives calendar from anywhere.

Sections built so far:
- **Archives** — the journal + calendar. One plain-text entry per day; a vertical,
  windowed day-scroll (lands on today) and a vertical-months calendar. Days are **just
  prose** now — completed to-dos and logged milestones fold into that day's entry as plain
  text lines (`✓ …` / `🏅 …`), not a separate structured checklist. (Markers are easily
  tweakable.)
- **Scratch** — freeform, iOS-Notes-style notes (list + per-note editor).
- **To-do** — checkbox-only tasks, grouped into free-form **categories** (drag a task
  across categories to recategorize; drag to reorder). Checking a task keeps it on the
  board struck-through until day's end, then it folds into that day's journal entry and
  leaves the list.
- **Tracker** — personal records / benchmarks (free-form value + unit, grouped by
  free-form category). Updating a value optionally logs a **milestone** (appended to today's
  entry as a `🏅 …` line, and dotted gold on the calendar).
- **Daily Reminders** (on the hub) — a quick recurring-habit checklist with a daily reset
  and a red miss-streak counter.

Integration already live (this is the important part, keep building on it):
- **Days aggregate as text.** Check off a To-do → it stays on the board (struck) until end
  of day, then folds into that day's journal entry as a `✓ …` line and leaves To-do. Logging
  a Tracker PR appends a `🏅 …` line under today. So Archives is a running log of what you
  actually did, alongside what you wrote — as prose, not a live structured projection. (This
  replaced an earlier design where a journal checkbox *was* a To-do; it was deliberately
  decoupled — Archives is journal text again, To-do stands alone.)
- **Cross-surfacing signals.** The calendar dots days with journal entries (accent) and
  days with milestones (gold — the milestone *records* are kept for the dots even though
  they now render inline as text).

Natural next objects to integrate (not yet built): **calendar events** and **goals** — both
should tie into the same day-oriented, cross-referenced fabric, not become islands.

## Architecture (current)
- **Section registry / extensibility seam.** A section is a self-contained module under
  `src/sections/<id>/` exporting a `SectionModule` (`src/lib/sections/types.ts`); they're
  listed in `src/lib/sections/registry.ts`. Adding a section is ideally a one-line
  registry addition + its module — no scattered edits. The hub draws a lobe per registered
  section. **This matters more than any individual feature.**
- **Generic keyed-collection sync.** `createCollection<T>(name)` (`src/lib/sync/collection.ts`)
  gives any record type (`{ id, updatedAt, ... }`) a local IndexedDB store + outbox +
  last-write-wins cloud sync. All non-journal data (reminders, notes, todos, benchmarks,
  milestones) lives in **one generic `docs` Supabase table** (jsonb payload, discriminated
  by a `collection` column) — **so a new object type needs no schema change.** The original
  journal `entries` has its own bespoke stack (kept as-is; do not rebuild it).
- **Local-first.** IndexedDB is authoritative for instant/offline reads; writes go through
  an outbox and reconcile with Supabase (last-write-wins by `updatedAt`, soft-delete
  tombstones). Works fully offline; syncs when configured/online.
- **Windowed day-scroll.** Hand-rolled virtualization with bidirectional scroll-anchoring
  (`src/lib/scroll/`, `src/components/DayScroll.svelte`) — keep it smooth on iPhone.
- **Hand-rolled drag-sort.** `src/lib/dnd/sortable.ts` — a group-aware pointer sortable
  (ghost clone + insertion line; rows carry `data-sortable-id`, handles `data-sortable-handle`;
  lists sharing a `group` allow cross-list moves → `onReorder(listId, orderedIds)`). Powers
  the To-do lists via `TaskList`/`TaskRow` (rendered-*selectable* click-to-edit rows). This
  replaced `svelte-dnd-action`, which is gone.
- **Brain hub widget.** `src/components/InteractiveBrainHub.svelte` — a themeable angular
  SVG "virtual brain" (four quarter hit-zones, hover/select glow, labels placed outside the
  brain, scoped unique ids, Svelte-5 callback props). `BrainHub` maps the four quarters →
  sections and `onselect` → `goSection`. Custom-property driven so it inherits app tokens.
- **Repository/collection seams.** All storage goes through interfaces so backends can be
  swapped/extended without touching UI.

## Persistence — read the risk, don't paper over it
- Entries/records in **IndexedDB**; cloud copy in Supabase. For a brain, data loss is the
  worst failure.
- iOS Safari can evict IndexedDB (even for installed PWAs) under storage pressure, so:
  call `navigator.storage.persist()` on first load; keep the **manual export** escape hatch
  working; show the one-time "stored locally on this device, back up via export" note.
- Autosave (debounced) as the user types; never rely on an explicit save. Persist on
  `visibilitychange`/`pagehide` (iOS may skip `unload`).

## Stack (decided — keep it, justify any change)
- **Svelte 5 (runes)** + **Vite** + **TypeScript** (strict, `noUncheckedIndexedAccess`).
- **IndexedDB via `idb`**; **Supabase** (`@supabase/supabase-js`) for auth + sync (anon key
  is public by design; RLS protects rows; it lives only in gitignored `.env`).
- **PWA via `vite-plugin-pwa`** (manifest + service worker, installable, autoupdate).
- **Drag-reorder is hand-rolled** (`src/lib/dnd/sortable.ts`, handle-initiated) — no
  `svelte-dnd-action` dependency anymore.
- **`@fontsource/space-grotesk`** (bundled woff2, precached) for the brain-widget labels.
- **Vitest** + `fake-indexeddb` for tests. Keep dependencies minimal and the code legible.

## Design / feel
- iOS-native aesthetics: system font stack, generous spacing, calm/minimal — closer to
  Notes/Reminders than a colorful web app. The app has a soft blue→lavender→pink gradient
  backdrop with a pink accent; sections read as frosted glass over it. **Mobile-first**
  (iPhone Safari first, then fine on Mac). Respect safe-area insets. Support light + dark
  via system preference **and** an always-available in-app toggle.
- Design tokens are centralized as CSS custom properties in `src/styles/global.css`; every
  component consumes them, so retuning cascades. Apply tokens consistently across sections.

## How I want you to work
1. For anything non-trivial: surface ambiguities and trade-offs, propose an approach, and
   get a quick nod before a big build. For a genuinely new capability, plan first.
2. Build in **vertical slices** — each works end-to-end before the next. After a slice, say
   how to test it and pause for feedback.
3. Keep it green: `npm run typecheck`, `npm run test`, `npm run build` before shipping.
4. **Commit + push proactively** after each feature (or a few small changes). `main`
   auto-deploys to Netlify; there's no separate release step. Don't branch — direct to
   `main`. Never commit `.env` or `.claude/settings.local.json`.
5. Verify UI changes by handing them to the owner to test (browser automation is off by
   default) — describe the exact steps to check.
6. **Push back** on anything here you think is wrong before implementing. Don't just execute.

## Success check
The owner opens Punk OS on their phone or Mac, lands in their brain, and moves fluidly
between writing, tasks, notes, reminders, and records — where the same thing (a task, a
day, a milestone) shows up wherever it's relevant, not trapped in one screen. New objects
plug into that fabric rather than becoming another silo.

## Deploy / ops
- Push to `main` → Netlify builds (`npm run build`) and deploys automatically.
- New object types need **no** Supabase schema change (generic `docs` table). The `docs`
  table + `entries` table SQL lives in `supabase/schema.sql` and must be run once in the
  Supabase project for cloud sync; the app works local-only until then.
