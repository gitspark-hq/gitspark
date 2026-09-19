import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { accounts, dailyContributions, streaks, users } from "@/db/schema";
import { fetchDailyContributions, GitHubError } from "./github";
import { addDays, computeStreak, toDateString } from "./streak";

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
  const today = toDateString(new Date());
  const lookback = existing?.lastSyncedAt ? INCREMENTAL_SYNC_DAYS : FULL_SYNC_DAYS;
  const from = addDays(today, -(lookback - 1));

  const days = await fetchDailyContributions(token, user.githubLogin, from, today);

  if (days.length) {
    // Row-by-row upsert; at most 365 rows on first sync, 7 after that.
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
          },
        });
    }
  }

  return recomputeStreak(userId, user.dailyGoal);
}

export async function recomputeStreak(userId: string, goal: number) {
  const today = toDateString(new Date());
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
