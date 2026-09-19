import type { Check } from "./types"

/** Twelve months, as the spec puts it. A year is long enough to be fair. */
const WINDOW_MONTHS = 12

/** The cutoff: this long before now, as a Date. */
function cutoff(now: Date): Date {
  const date = new Date(now)
  date.setUTCMonth(date.getUTCMonth() - WINDOW_MONTHS)
  return date
}

export const recentlyUpdated: Check = {
  id: "recently-updated",
  title: "Touched in the last year",
  weight: 4,

  why: "A repo nobody has pushed to in over a year reads as abandoned, whether or not it is finished.",

  howToFix: "Make a real commit: bump a dependency, fix a typo in the README, or add the archived label if the project is genuinely done.",

  run: ({ repo }) => {
    // Never pushed means never touched. Empty repos land here.
    if (repo.pushed_at === null) return "fail"

    return new Date(repo.pushed_at) >= cutoff(new Date()) ? "pass" : "fail"
  },
}
