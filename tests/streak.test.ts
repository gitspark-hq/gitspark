import { describe, it, expect } from "vitest";
import { computeStreak, addDays, levelForXp, type DayCounts } from "../src/lib/streak";

const day = (date: string, total = 1, extra: Partial<DayCounts> = {}): DayCounts => ({
  date,
  commits: total,
  prs: 0,
  reviews: 0,
  issues: 0,
  total,
  ...extra,
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29"); // leap year
  });
});

describe("computeStreak", () => {
  it("handles empty history", () => {
    const r = computeStreak([], 1, "2026-09-18");
    expect(r).toMatchObject({ currentStreak: 0, longestStreak: 0, xp: 0, level: 0, atRisk: false });
    expect(r.lastActiveDate).toBeNull();
  });

  it("counts a streak ending today", () => {
    const days = [day("2026-09-16"), day("2026-09-17"), day("2026-09-18")];
    const r = computeStreak(days, 1, "2026-09-18");
    expect(r.currentStreak).toBe(3);
    expect(r.longestStreak).toBe(3);
    expect(r.atRisk).toBe(false);
  });

  it("keeps the streak alive (at risk) when only yesterday is met", () => {
    const days = [day("2026-09-16"), day("2026-09-17")];
    const r = computeStreak(days, 1, "2026-09-18");
    expect(r.currentStreak).toBe(2);
    expect(r.atRisk).toBe(true);
  });

  it("breaks the streak when yesterday is missed", () => {
    const days = [day("2026-09-15"), day("2026-09-16")];
    const r = computeStreak(days, 1, "2026-09-18");
    expect(r.currentStreak).toBe(0);
    expect(r.longestStreak).toBe(2);
    expect(r.lastActiveDate).toBe("2026-09-16");
  });

  it("respects a goal greater than 1", () => {
    const days = [day("2026-09-17", 5), day("2026-09-18", 2)];
    expect(computeStreak(days, 3, "2026-09-18").currentStreak).toBe(1);
    expect(computeStreak(days, 3, "2026-09-18").atRisk).toBe(true);
    expect(computeStreak(days, 1, "2026-09-18").currentStreak).toBe(2);
  });

  it("ignores zero-total days and unordered input", () => {
    const days = [day("2026-09-18"), day("2026-09-17", 0), day("2026-09-16")];
    const r = computeStreak(days, 1, "2026-09-18");
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(1);
  });

  it("tracks a streak across a year boundary", () => {
    const days = [day("2025-12-30"), day("2025-12-31"), day("2026-01-01"), day("2026-01-02")];
    const r = computeStreak(days, 1, "2026-01-02");
    expect(r.currentStreak).toBe(4);
  });

  it("finds the longest historical streak even if current is shorter", () => {
    const days = [
      day("2026-09-01"), day("2026-09-02"), day("2026-09-03"), day("2026-09-04"),
      day("2026-09-17"), day("2026-09-18"),
    ];
    const r = computeStreak(days, 1, "2026-09-18");
    expect(r.currentStreak).toBe(2);
    expect(r.longestStreak).toBe(4);
  });

  it("computes XP and levels", () => {
    const days = [day("2026-09-18", 4, { commits: 2, prs: 1, reviews: 1 })];
    const r = computeStreak(days, 1, "2026-09-18");
    expect(r.xp).toBe(2 * 10 + 30 + 20);
    expect(levelForXp(0)).toBe(0);
    expect(levelForXp(99)).toBe(0);
    expect(levelForXp(100)).toBe(1);
    expect(levelForXp(400)).toBe(2);
    expect(levelForXp(900)).toBe(3);
  });
});
