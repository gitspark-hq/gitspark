import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { dailyContributions, streaks, users } from "@/db/schema";
import { addDays, computeStreak } from "@/lib/streak";
import { nowIn } from "@/lib/time";
import { getGrade, partitionOutcomes, rankWorstFirst } from "@/lib/grade";

/** Everything the on-device model is shown. Kept small: Nano has a short context window. */
export type ProfileSummary = {
  login: string;
  generatedAt: string;
  activity: {
    currentStreak: number;
    longestStreak: number;
    dailyGoal: number;
    activeDaysLast90: number;
    activeDaysLast365: number;
    commits365: number;
    prs365: number;
    reviews365: number;
    issues365: number;
    /** Repos touched in the last 30 days with commit counts, most active first. */
    recentRepos: { repo: string; commits: number; prs: number }[];
  };
  grade: null | {
    letter: string;
    score: number;
    repoCount: number;
    /** Most common failing checks across the account. */
    patterns: { check: string; failing: number; of: number; fix: string }[];
    /** Worst three repos with what they fail. */
    worst: { name: string; score: number; fails: string[]; fixes: string[] }[];
    /** Best two repos. */
    best: { name: string; score: number }[];
    gradedAt: string;
  };
};

export async function buildProfileSummary(userId: string): Promise<ProfileSummary | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.githubLogin) return null;

  const today = nowIn(user.timezone).date;
  const since = addDays(today, -364);
  const days = await db
    .select()
    .from(dailyContributions)
    .where(and(eq(dailyContributions.userId, userId), gte(dailyContributions.date, since)));

  const s = computeStreak(days, user.dailyGoal, today);
  const last90 = addDays(today, -89);
  const last30 = addDays(today, -29);

  const totals = days.reduce(
    (acc, d) => ({
      commits: acc.commits + d.commits,
      prs: acc.prs + d.prs,
      reviews: acc.reviews + d.reviews,
      issues: acc.issues + d.issues,
    }),
    { commits: 0, prs: 0, reviews: 0, issues: 0 },
  );

  const repoMap = new Map<string, { repo: string; commits: number; prs: number }>();
  for (const d of days) {
    if (d.date < last30 || !d.repos) continue;
    for (const r of d.repos) {
      const e = repoMap.get(r.repo) ?? { repo: r.repo, commits: 0, prs: 0 };
      e.commits += r.commits;
      e.prs += r.prs;
      repoMap.set(r.repo, e);
    }
  }
  const recentRepos = [...repoMap.values()].sort((a, b) => b.commits + b.prs - (a.commits + a.prs)).slice(0, 6);

  const grade = await getGrade(userId);
  const ranked = grade ? rankWorstFirst(grade.scores) : [];
  const [streakRow] = await db.select({ at: streaks.lastSyncedAt }).from(streaks).where(eq(streaks.userId, userId)).limit(1);
  const dataAt = new Date(Math.max(streakRow?.at?.getTime() ?? 0, grade?.gradedAt.getTime() ?? 0) || Date.now());

  return {
    login: user.githubLogin,
    generatedAt: dataAt.toISOString(),
    activity: {
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
      dailyGoal: user.dailyGoal,
      activeDaysLast90: days.filter((d) => d.date >= last90 && d.total > 0).length,
      activeDaysLast365: days.filter((d) => d.total > 0).length,
      commits365: totals.commits,
      prs365: totals.prs,
      reviews365: totals.reviews,
      issues365: totals.issues,
      recentRepos,
    },
    grade: grade
      ? {
          letter: grade.accountGrade,
          score: grade.accountScore,
          repoCount: grade.scores.length,
          patterns: grade.findings.patterns.map((p) => ({ check: p.check.title, failing: p.count, of: p.applicable, fix: p.check.howToFix })),
          worst: ranked.slice(0, 3).map((r) => ({
            name: r.repo.name,
            score: r.score,
            fails: partitionOutcomes(r.outcomes).failed.map((o) => o.check.title),
            fixes: partitionOutcomes(r.outcomes).failed.map((o) => o.check.howToFix),
          })),
          best: [...ranked].reverse().slice(0, 2).map((r) => ({ name: r.repo.name, score: r.score })),
          gradedAt: grade.gradedAt.toISOString(),
        }
      : null,
  };
}
