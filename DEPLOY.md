# Deploy + install on iPhone

Goal: put the journal on your iPhone home screen as a real installed app, syncing
via Supabase. This needs an HTTPS URL (required for an installable PWA), so we
deploy the static build to a free host.

## 1. Build (bakes in your Supabase keys)
`VITE_*` env vars are inlined at build time, so build locally with your `.env`
already filled in (see [SETUP-SYNC.md](SETUP-SYNC.md)):
```
npm run build      # outputs dist/
```
Nothing secret needs to live on the host — the anon key is public and RLS protects
the data.

## 2. Deploy `dist/` to HTTPS
Pick one (all free, all give an `https://` URL):

**Netlify** (simplest — literal drag & drop, no CLI):
- Go to https://app.netlify.com/drop and drag the `dist/` folder in.
- Or CLI: `npx netlify deploy --dir=dist --prod`

**Vercel:** `npx vercel deploy --prod dist`

**Cloudflare Pages:** `npx wrangler pages deploy dist`

You'll get a URL like `https://your-app.netlify.app`. Redeploy (rebuild + upload)
whenever the code changes.

## 3. Tell Supabase about the URL
In the Supabase dashboard → **Authentication → URL Configuration**, add your
deployed URL to **Site URL** and **Redirect URLs** (keep `http://localhost:5173`
too). Make sure the email code template is set up (step 3 of SETUP-SYNC.md).

## 4. Install on iPhone
1. Open the deployed `https://…` URL in **Safari** on your iPhone.
2. Tap **Share → Add to Home Screen**.
3. Launch the app from its new home-screen icon.
4. Enter your email → check email for the **6-digit code** → type it in → signed in.

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
