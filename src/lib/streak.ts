/**
 * Pure streak / XP math. No I/O so it can be unit-tested in isolation.
 *
 * Dates are YYYY-MM-DD strings in GitHub's calendar (UTC). See README for
 * why we follow GitHub's day boundaries rather than the user's timezone.
 */

export type DayCounts = {
  date: string; // YYYY-MM-DD
  commits: number;
  prs: number;
  reviews: number;
  issues: number;
  total: number;
};

export const XP_PER = {
  commit: 10,
  pr: 30,
  review: 20,
  issue: 5,
} as const;

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  xp: number;
  level: number;
  /** XP needed to reach the next level, and progress toward it (0..1). */
  nextLevelXp: number;
  levelProgress: number;
  /** True when today hasn't met the goal but yesterday did — the streak is alive but at risk. */
  atRisk: boolean;
};

export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return toDateString(d);
}

export function xpForDay(day: Pick<DayCounts, "commits" | "prs" | "reviews" | "issues">): number {
  return (
    day.commits * XP_PER.commit +
    day.prs * XP_PER.pr +
    day.reviews * XP_PER.review +
    day.issues * XP_PER.issue
  );
}

export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100));
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}

/**
 * @param days   Any order, may contain gaps. Days with total 0 are treated the same as missing.
 * @param goal   Minimum `total` for a day to count toward the streak.
 * @param today  YYYY-MM-DD in GitHub's (UTC) calendar.
 */
export function computeStreak(days: DayCounts[], goal: number, today: string): StreakResult {
  const met = new Set<string>();
  let xp = 0;
  for (const d of days) {
    xp += xpForDay(d);
    if (d.total >= goal) met.add(d.date);
  }

  // Current streak: walk backwards from today. If today isn't met yet, the streak
  // is still alive as long as yesterday was — the user has until midnight.
  const yesterday = addDays(today, -1);
  let cursor: string | null = null;
  if (met.has(today)) cursor = today;
  else if (met.has(yesterday)) cursor = yesterday;

  let currentStreak = 0;
  let lastActiveDate: string | null = null;
  if (cursor) {
    lastActiveDate = cursor;
    while (met.has(cursor)) {
      currentStreak++;
      cursor = addDays(cursor, -1);
    }
  } else {
    // Streak is broken; still report the most recent active day for the UI.
    const sorted = [...met].sort();
    lastActiveDate = sorted.length ? sorted[sorted.length - 1] : null;
  }

  // Longest streak: scan all met days in order.
  const sorted = [...met].sort();
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
    prev = d;
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  const level = levelForXp(xp);
  const nextLevelXp = xpForLevel(level + 1);
  const currentLevelXp = xpForLevel(level);
  const levelProgress = (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);

  return {
    currentStreak,
    longestStreak,
    lastActiveDate,
    xp,
    level,
    nextLevelXp,
    levelProgress,
    atRisk: currentStreak > 0 && !met.has(today),
  };
}
