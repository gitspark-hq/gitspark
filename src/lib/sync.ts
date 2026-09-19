import { and, eq, gt, gte } from "drizzle-orm";
import { db } from "@/db";
import { accounts, dailyContributions, streaks, users } from "@/db/schema";
import { fetchDailyContributions, fetchLocalDays, GitHubError, type FetchedDay } from "./github";
import { nowIn } from "./time";
import { addDays, computeStreak } from "./streak";

const FULL_SYNC_DAYS = 365;
const INCREMENTAL_SYNC_DAYS = 7;

export async function getGitHubToken(userId: string) {
  const [acct] = await db
    .select({ token: accounts.access_token })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "github")))
    .limit(1);
  return acct?.token ?? null;
}

/**
 * Pulls contributions from GitHub into daily_contributions and recomputes the
 * user's streak row. Does a 365-day backfill on first run, 7 days after that.
 */
export async function syncUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.githubLogin) throw new Error(`User ${userId} has no GitHub login`);

  const token = await getGitHubToken(userId);
  if (!token) throw new GitHubError("No GitHub token stored for user", 401);

  const [existing] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
  const today = nowIn(user.timezone).date; // user's local date

  // History: wide windows over GitHub's UTC calendar (cheap; exact totals, estimated type
  // split). Days near "now" get overwritten by the exact local-day fetch below. First run only.
  if (!existing?.lastSyncedAt) {
    const from = addDays(today, -(FULL_SYNC_DAYS - 1));
    const history = await fetchDailyContributions(token, user.githubLogin, from, today, 7);
    await upsertDays(userId, history);
  }

  // Recent days: one call per *local* day, so counts are exact in the user's timezone and
  // "today" rolls over at their midnight, not UTC's.
  const recentDates = Array.from({ length: INCREMENTAL_SYNC_DAYS }, (_, i) =>
    addDays(today, -(INCREMENTAL_SYNC_DAYS - 1 - i)),
  );
  const recent = await fetchLocalDays(token, user.githubLogin, recentDates, user.timezone);
  await upsertDays(userId, recent);

  // A timezone change (or the old UTC-based sync) can leave rows dated after the local today.
  await db
    .delete(dailyContributions)
    .where(and(eq(dailyContributions.userId, userId), gt(dailyContributions.date, today)));

  return recomputeStreak(userId, user.dailyGoal, user.timezone);
}

async function upsertDays(userId: string, days: FetchedDay[]) {
  for (const d of days) {
    await db
      .insert(dailyContributions)
      .values({ userId, ...d })
      .onConflictDoUpdate({
        target: [dailyContributions.userId, dailyContributions.date],
        set: {
          commits: d.commits,
          prs: d.prs,
          reviews: d.reviews,
          issues: d.issues,
          total: d.total,
          repos: d.repos,
          exact: d.exact,
        },
      });
  }
}

export async function recomputeStreak(userId: string, goal: number, timezone: string) {
  const today = nowIn(timezone).date;
  const since = addDays(today, -(FULL_SYNC_DAYS - 1));
  const rows = await db
    .select()
    .from(dailyContributions)
    .where(and(eq(dailyContributions.userId, userId), gte(dailyContributions.date, since)));

  const result = computeStreak(rows, goal, today);

  await db
    .insert(streaks)
    .values({
      userId,
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      lastActiveDate: result.lastActiveDate,
      xp: result.xp,
      lastSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: streaks.userId,
      set: {
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
        lastActiveDate: result.lastActiveDate,
        xp: result.xp,
        lastSyncedAt: new Date(),
      },
    });

  return result;
}
