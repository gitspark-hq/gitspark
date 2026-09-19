# 🔥 GitStreak

Duolingo for your GitHub profile. Sign in with GitHub, set a daily goal, keep your contribution
streak alive, earn XP for commits / PRs / reviews / issues, and get an email before the day ends
if your streak is at risk.

**Stack:** Next.js 16 (App Router) · Auth.js (GitHub OAuth) · Drizzle + Postgres (Supabase) ·
Resend (email) · GitHub Actions (hourly cron).

## Setup

1. **Clone & install**
   ```bash
   npm install
   cp .env.example .env
   ```

2. **GitHub OAuth App** — <https://github.com/settings/developers> → *New OAuth App*
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
   - Put the Client ID / Secret in `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`.

3. **Auth secret**
   ```bash
   npx auth secret
   ```

4. **Database** — create a free Supabase project, copy the *Transaction pooler* connection string
   (port 6543) into `DATABASE_URL`, then push the schema:
   ```bash
   npm run db:push
   ```

5. **Email (optional for local dev)** — get a Resend API key. `onboarding@resend.dev` can send to
   your own address without a verified domain.

6. **Cron secret** — any random string in `CRON_SECRET`.

7. **Run**
   ```bash
   npm run dev
   ```

## How it works

| Piece | Where |
|---|---|
| GitHub GraphQL `contributionsCollection` fetch | `src/lib/github.ts` |
| Sync → `daily_contributions` upsert → streak recompute | `src/lib/sync.ts` |
| Pure streak / XP math (unit-tested) | `src/lib/streak.ts`, `tests/streak.test.ts` |
| Hourly full re-sync of every user | `GET /api/cron/sync-all` |
| Hourly "streak at risk" reminder emails | `GET /api/cron/remind` |
| Manual sync for the signed-in user | `POST /api/sync` |
| Dashboard (streak, XP, heatmap, today's goal) | `src/app/dashboard` |
| Settings (goal, timezone, reminder hour) | `src/app/settings` |

**XP:** 10 / commit · 30 / PR · 20 / review · 5 / issue. Level = ⌊√(XP / 100)⌋.

**Timezones:** streak days follow GitHub's calendar (UTC) so the app always agrees with the graph
on your profile. Your timezone is only used to decide *when* to send the reminder.

**Private contributions:** the GraphQL call uses your own OAuth token, so your private activity is
counted (as a total) without needing the `repo` scope.

## Testing the cron routes locally

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-all
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/remind
```

Set your reminder hour (Settings) to the current hour and make sure today's goal isn't met — the
first call to `/remind` sends one email; a second call sends none (`reminder_log` de-dupes).

## Deploy

Push to GitHub, import into Vercel, add every variable from `.env.example`, and update the GitHub
OAuth App's callback URL to `https://<your-domain>/api/auth/callback/github`.

Hourly sync + reminders run from `.github/workflows/cron.yml` (Vercel's free plan only allows
daily crons). Add two repo secrets: `APP_URL` (your Vercel URL) and `CRON_SECRET` (same value as
on Vercel).

## Scripts

```bash
npm test          # vitest
npm run typecheck # tsc --noEmit
npm run db:push   # apply schema to DATABASE_URL
npm run db:studio # browse the DB
```
