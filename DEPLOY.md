# Deploy + install on iPhone

Goal: put the journal on your iPhone home screen as a real installed app, syncing via
Supabase. This needs an HTTPS URL (required for an installable PWA). The app is a static
PWA — the host only runs the Vite build and serves `dist/` over HTTPS; "installability" and
offline come from the PWA itself, not the host, so hosts are interchangeable.

## Hosting: Vercel (primary) + Netlify (fallback)
Both are connected to the GitHub repo and auto-build from `main` — every push rebuilds and
redeploys, no manual step. **Vercel** is the primary host (config in `vercel.json`);
**Netlify** still builds from `main` in parallel (`netlify.toml`) as a fallback and can be
retired once Vercel is trusted.

Both free tiers are fine for a single-user app and won't charge a card you haven't added —
if you ever blew past the free limits the service just pauses, it doesn't silently bill.
(Vercel's Hobby tier is for non-commercial use; a personal journal qualifies. Supabase's
free project pauses after ~7 days of no activity, which daily use prevents.)

## 1. Environment variables (set these before the first build)
`VITE_*` vars are inlined **at build time**. For git-connected builds, set them in the host
dashboard *before* deploying, or the bundle ships with empty Supabase keys and the app
silently runs local-only (no sync). In the Vercel project → **Settings → Environment
Variables**, add (values from your local `.env`, see [SETUP-SYNC.md](SETUP-SYNC.md)):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Nothing here is secret — the anon key is public and RLS protects the data.

## 2. Set up Vercel (one time)
1. vercel.com → sign in with GitHub → **Add New → Project** → import this repo.
2. It detects Vite; confirm Build Command `npm run build`, Output Directory `dist`.
3. Add the two env vars from step 1. (Optionally set Node.js Version to 20.x to match
   `netlify.toml`.)
4. Deploy → you get a URL like `https://your-app.vercel.app`. After this, every push to
   `main` redeploys automatically.

## 3. Tell Supabase about the URL
In the Supabase dashboard → **Authentication → URL Configuration**, add your deployed URL to
**Site URL** and **Redirect URLs**. Keep `http://localhost:5173` and any other host URL
(e.g. the Netlify one) in the list too. Make sure the email code template is set up (step 3
of SETUP-SYNC.md).

## 4. Install on iPhone
1. Open the deployed `https://…` URL in **Safari** on your iPhone.
2. Tap **Share → Add to Home Screen**.
3. Launch the app from its new home-screen icon.
4. Enter your email → check email for the **6-digit code** → type it in → signed in.

> Switching hosts/URLs changes the **origin**, so the freshly installed app starts with an
> empty local store — signing in re-pulls everything from Supabase. Your old home-screen app
> (on the previous URL) keeps working untouched until you delete it.

## 5. Verify sync
- Write an entry on the phone.
- On your laptop, open the same deployed URL (or `npm run dev`) and sign in with
  the **same email** → the entry should appear; edits flow both ways.
- Offline test: put the phone in airplane mode, edit a day, reconnect → it
  propagates on the next open/focus.

## Notes
- The code email uses Supabase's built-in mailer (rate-limited; may hit spam the
  first time). Fine for personal use; add custom SMTP later if you want.
- iOS may evict local storage for web apps under pressure; sync + the Export button
  are your backups. Signing in re-pulls everything from the cloud anyway.
- Manual one-off deploy (no git): `npm run build`, then `npx vercel deploy --prod dist`
  (Vercel) or `npx netlify deploy --dir=dist --prod` (Netlify). With a local build the
  `VITE_*` vars come from your `.env` instead of the dashboard.
