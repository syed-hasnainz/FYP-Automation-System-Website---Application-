# Release APK build + test

## Backend (production)

Live server: **https://hamdard-automation.onrender.com**

Mobile app `src/config/api.ts` already points here (`REMOTE_API_ORIGIN`, `PRODUCTION_API_ORIGIN`).

- Internet required (same Wi‑Fi as laptop **not** required for normal use).
- Render **free tier**: first request after sleep can take **~1 minute** — wait, then retry.
- Faculty/department data is stored on this server; admin changes appear on registration after save.

Optional local testing only — change `REMOTE_API_ORIGIN` in `api.ts` to `http://YOUR_PC_IP:3000` and run `fypFinal` locally.

### Deploy backend changes to Render

After changing `fypFinal` (API, Prisma schema, etc.):

1. Commit and push to the repo connected to [Render](https://hamdard-automation.onrender.com).
2. Render runs `npm install` → `prisma generate` (postinstall) → `npm run build` (`prisma db push` + `next build`).
3. Wait for deploy to finish (~2–5 min). Free tier may sleep — first app request can take ~1 minute.

Mobile app **does not** need a new APK when only the server changes — it already calls `https://hamdard-automation.onrender.com`.

## APK build

```powershell
cd f:\Projects\UniFyp\mobileFyp\android
.\gradlew assembleRelease
```

APK: `android\app\build\outputs\apk\release\app-release.apk`

Signing: `android/app/release-signing.properties` + `debug.keystore` (test ke liye).

## Install phone par

USB ya APK file share → install → **mobile data or Wi‑Fi** (production URL).

## Test flow (faculty + departments)

1. Admin login → **Organization** → **Add Faculty** → departments as tags → save.
2. Logout → **Register** → Faculty dropdown → Department dropdown (filtered by faculty).
3. If lists are empty, pull to refresh on Organization or reopen Register tab (cold start may delay first load).

## Verify backend in browser

- Health: https://hamdard-automation.onrender.com/api/health
- Faculties: https://hamdard-automation.onrender.com/api/admin/faculties
