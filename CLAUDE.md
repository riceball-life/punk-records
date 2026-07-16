# CLAUDE.md — Journal (personal journaling PWA)

## What this is
A single-user personal journaling web app (PWA) that feels like the iOS Reminders app but for journal entries. One entry per day. Built to install to the home screen on iPhone (Safari) and to the dock on macOS (Safari/Chrome). No accounts, no server, no multi-user. This is an MVP.

## Core interaction model (READ THIS FIRST)
The reference app is **iOS Reminders**. Imitate its feel, not a generic web layout.

- **Main screen = vertical scroll of days.** Each day is a section: the date as a header, and below it a plain-text journal entry for that day. Scroll up = back in time, scroll down = forward. The app lands on **today** by default.
- **Every day renders**, even empty ones (like Reminders shows all dates). An empty day shows a tappable placeholder to start writing.
- **Calendar screen = vertically-scrolling months.** Same Reminders feel: months stacked vertically, scrollable. Tapping any day navigates back to the main scroll view, positioned at that day, ready to edit.
- Editing any past or future date is allowed. No "today only" restriction.

## Scroll / loading strategy (do it this way, it's not hard)
The day list is chronological and sequential — do NOT overcomplicate this.

- **Windowing, not full render.** Keep only a small window of day-rows in the DOM (e.g. render in batches of ~10, keep a buffer above and below the viewport, recycle rows as they scroll out). Do not render thousands of rows. This is the one thing that must be right so it stays smooth on iPhone.
- **Downward scroll:** as the user nears the bottom of the loaded window, append the next batch of days.
- **Upward scroll (into the past):** prepend the previous batch. Use scroll-anchoring so prepending rows above the viewport does NOT make the content visibly jump. This is the only slightly fiddly bit — handle it deliberately.
- **Jump-to-date (calendar tap):** navigate directly to a target date without forcing the user to scroll through every intervening day. Rebuild the window centered on the target date rather than scrolling through the whole range.
- A small fixed load/buffer with a little loading is totally acceptable. Prioritize simplicity and smooth feel over cleverness.

## Scope — MVP
IN:
- One plain-text entry per calendar day. No timestamps.
- Vertical day-scroll with the windowing strategy above (both directions).
- Calendar view (vertical months) with tap-to-navigate-to-day.
- Edit any date; autosave.
- Local persistence (see Persistence).
- Installable PWA (manifest + service worker) for iOS home screen and macOS dock.

OUT (don't build in MVP, but don't let the architecture block them):
- iCloud / cross-device sync.
- Multiple entries per day, timestamps.
- Rich text / images.
- Auth / multi-user.

STRETCH (only if cheap, after the above works, in this order):
1. **Manual "export all entries to a .txt/.json file"** — a single button that dumps everything to a downloadable file. This is the user's escape hatch against local data loss (see Persistence risk). Keep it dead simple. Prefer building this early if it's low-cost.
2. Markdown-style bullets (`- `) and checkboxes (`- [ ]` / `- [x]`) rendered inline. Implement as lightweight markdown, NOT a rich-text editor. If it adds real complexity, skip it.

## Persistence — read the risk, don't paper over it
- Store entries in **IndexedDB** (not localStorage). Use a thin wrapper such as `idb`.
- Data model: an entry is `{ date: 'YYYY-MM-DD' (primary key), text: string, updatedAt: ISO string }`. Days with no record render as empty in the UI.
- **Known risk, must be handled:** iOS Safari can evict IndexedDB for sites that go unused, and even installed PWAs can be evicted under storage pressure. For a journal, data loss is the worst possible failure. Therefore:
  - Call `navigator.storage.persist()` on first load to request durable storage.
  - Put all reads/writes behind a small **repository interface** so a future backup/sync layer can be added without touching UI code.
  - The manual export button (stretch #1) is the near-term safety net — bias toward shipping it early.
  - Show a one-time, dismissible note telling the user data is stored locally on this device and to use export to back up.
- Autosave entries (debounced) as the user types; don't rely on an explicit save action.

## Stack
Propose the stack in step 1 and wait for approval. Guidance:
- Lightweight client-only SPA. **Argue React vs Svelte for this specific app and pick one** — Svelte tends to mean less code for something this small; React has more mature virtualization/windowing options. Justify the choice.
- Windowing: a small, well-maintained virtualization library OR a hand-rolled solution — whichever is simpler and gives reliable bidirectional scroll anchoring. Justify.
- IndexedDB via `idb` or similar thin wrapper.
- PWA via the Vite PWA plugin (or hand-rolled manifest + service worker) — justify.
- No backend. Everything runs client-side. Keep dependencies minimal and the codebase legible and maintainable.

## Design / feel
- Match iOS system aesthetics: system font stack, generous spacing, subtle date headers, the calm/minimal look of Reminders. Not a colorful web app.
- **Mobile-first.** It must feel right on an iPhone in Safari first, then be fine on a Mac.
- Respect safe-area insets (notch / home indicator) so it works installed on iPhone.
- Support light and dark mode via system preference.

## How I want you to work
1. **Do not start coding.** First: (a) list anything ambiguous or any assumption you're making and ask me, (b) propose the stack + directory structure with brief trade-offs, (c) wait for my approval.
2. Then build **one vertical slice at a time**, in this order. Each must work end-to-end before the next:
   1. Data model + IndexedDB repository layer (with the interface seam for future backup).
   2. Main day-scroll view: windowed vertical scroll (both directions, with scroll-anchoring), one day's plain-text entry editable and autosaving. Lands on today.
   3. Calendar view: vertical scrolling months; tap a day to navigate to the day-scroll positioned at that date.
   4. PWA setup: manifest, service worker, installable, `navigator.storage.persist()`, safe-area handling, dark mode.
   5. (Stretch) export button, then markdown bullets/checkboxes.
3. After each slice, tell me how to run and test it, then pause for feedback before moving on.
4. Flag trade-offs and push back on anything in this file you think is wrong before implementing it. Don't just execute.

## Success check for MVP
I can install it on my iPhone home screen and my Mac dock, scroll a Reminders-like list of days, tap into any day and write plain text that autosaves, come back later and it's still there, and jump to any date via a vertical-months calendar.
