# Enabling cloud sync (Supabase)

The app works fully offline/local without this. Do these steps once to turn on
cross-device sync. Until `.env` has real values, the app stays in local-only mode.

## 1. Create a Supabase project
1. Sign up at https://supabase.com (free tier is plenty; no card needed).
2. Create a new project. Pick a region near you. Wait for it to provision.

## 2. Create the schema
1. In the dashboard: **SQL Editor → New query**.
2. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and **Run**.
   This creates the `entries` table, the pull index, and Row-Level Security so
   each user only sees their own rows.

## 3. Configure email sign-in (code-based)
Sign-in uses a **6-digit code** typed in the app (this is the reliable path for an
installed iOS home-screen app; a magic link would open Safari and miss the
installed app). Two settings:

1. **Authentication → Providers → Email**: make sure it's enabled.
2. **Authentication → Email Templates → "Magic Link"**: add the code to the
   template so the email contains it. Include a line like:
   ```
   Your code: {{ .Token }}
   ```
   (Leave the existing link in too — it's a Safari fallback.)
3. **Authentication → URL Configuration → Site URL / Redirect URLs**: add
   `http://localhost:5173` for dev, and your deployed HTTPS URL once you have it
   (see [DEPLOY.md](DEPLOY.md)).

## 4. Wire the keys
1. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
2. In the repo: `cp .env.example .env` and paste them in:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Restart `npm run dev`. You'll get a sign-in screen: enter your email, then enter
   the **6-digit code** from the email. Existing local entries are pushed up on
   first sign-in.

> The anon key is meant to be public (it ships in the browser bundle). Row-Level
> Security is what actually protects your data — never expose the *service_role*
> key in the client.

## Using it on multiple devices
Sign in with the **same email** on your phone and laptop. Each device keeps a
local copy and reconciles with the cloud on open/focus (last write wins). To put
it on your iPhone home screen, see [DEPLOY.md](DEPLOY.md).
