import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { dailyContributions, streaks, users } from "@/db/schema";
import { addDays, computeStreak, type StreakResult } from "@/lib/streak";
import { nowIn } from "@/lib/time";
import { getGrade } from "@/lib/grade";

export type PublicProfile = {
  login: string;
  name: string | null;
  avatar: string | null;
  joinedAt: Date;
  dailyGoal: number;
  streak: StreakResult;
  today: string;
  doneToday: number;
  /** date -> total, for the heatmap. */
  counts: Map<string, number>;
  activeDays365: number;
  totals: { commits: number; prs: number; reviews: number; issues: number };
  grade: { letter: string; score: number; repoCount: number } | null;
  lastSyncedAt: Date | null;
  /** True when the viewer is the owner, which also allows previewing a private page. */
  isOwner: boolean;
  isPublic: boolean;
};

/**
 * A profile by GitHub login, or null when it does not exist or the owner has
 * not made it public. `viewerId` lets the owner preview their own page before
 * turning sharing on.
 */
export async function getPublicProfile(login: string, viewerId?: string): Promise<PublicProfile | null> {
  const [user] = await db.select().from(users).where(eq(users.githubLogin, login)).limit(1);
  if (!user?.githubLogin) return null;
  if (!user.publicProfile && user.id !== viewerId) return null;

  const today = nowIn(user.timezone).date;
  const since = addDays(today, -364);
  const days = await db
    .select()
    .from(dailyContributions)
    .where(and(eq(dailyContributions.userId, user.id), gte(dailyContributions.date, since)));

  const [streakRow] = await db.select().from(streaks).where(eq(streaks.userId, user.id)).limit(1);
  const grade = await getGrade(user.id);

  return {
    login: user.githubLogin,
    name: user.name,
    avatar: user.image,
    joinedAt: user.createdAt,
    dailyGoal: user.dailyGoal,
    streak: computeStreak(days, user.dailyGoal, today),
    today,
    doneToday: days.find((d) => d.date === today)?.total ?? 0,
    counts: new Map(days.map((d) => [d.date, d.total])),
    activeDays365: days.filter((d) => d.total > 0).length,
    totals: days.reduce(
      (acc, d) => ({
        commits: acc.commits + d.commits,
        prs: acc.prs + d.prs,
        reviews: acc.reviews + d.reviews,
        issues: acc.issues + d.issues,
      }),
      { commits: 0, prs: 0, reviews: 0, issues: 0 },
    ),
    grade: grade ? { letter: grade.accountGrade, score: grade.accountScore, repoCount: grade.scores.length } : null,
    lastSyncedAt: streakRow?.lastSyncedAt ?? null,
    isOwner: user.id === viewerId,
    isPublic: user.publicProfile,
  };
}

/** Just the numbers the social card needs. Skips the heatmap query entirely. */
export async function getCardStats(login: string) {
  const [user] = await db.select().from(users).where(eq(users.githubLogin, login)).limit(1);
  if (!user?.githubLogin || !user.publicProfile) return null;

  const today = nowIn(user.timezone).date;
  const since = addDays(today, -364);
  const days = await db
    .select({ date: dailyContributions.date, total: dailyContributions.total })
    .from(dailyContributions)
    .where(and(eq(dailyContributions.userId, user.id), gte(dailyContributions.date, since)));

  const streak = computeStreak(
    days.map((d) => ({ ...d, commits: 0, prs: 0, reviews: 0, issues: 0 })),
    user.dailyGoal,
    today,
  );
  const [streakRow] = await db.select({ xp: streaks.xp }).from(streaks).where(eq(streaks.userId, user.id)).limit(1);
  const grade = await getGrade(user.id);

  return {
    login: user.githubLogin,
    name: user.name,
    avatar: user.image,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    xp: streakRow?.xp ?? 0,
    level: Math.floor(Math.sqrt(Math.max(0, streakRow?.xp ?? 0) / 100)),
    activeDays365: days.filter((d) => d.total > 0).length,
    grade: grade ? { letter: grade.accountGrade, score: grade.accountScore } : null,
    /** Last 26 weeks of daily totals, oldest first, for the sparkline strip. */
    recent: Array.from({ length: 182 }, (_, i) => {
      const date = addDays(today, -(181 - i));
      return days.find((d) => d.date === date)?.total ?? 0;
    }),
  };
}
