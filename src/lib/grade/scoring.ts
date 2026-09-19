import { checks as registry } from "./checks"
import type { Check, CheckResult, RepoContext } from "./checks"
import type { GitHubRepo } from "./types"

export type Grade = "A" | "B" | "C" | "D" | "F"

export interface CheckOutcome {
  check: Check
  result: CheckResult
}

export interface RepoScore {
  repo: GitHubRepo
  outcomes: CheckOutcome[]
  /** Points earned from passing checks. */
  earned: number
  /** Points that were on the table. */
  possible: number
  /** earned over possible as a whole number out of 100. */
  score: number
  grade: Grade
}

/** A 90+, B 75-89, C 60-74, D 40-59, F below 40. */
export function gradeFor(score: number): Grade {
  if (score >= 90) return "A"
  if (score >= 75) return "B"
  if (score >= 60) return "C"
  if (score >= 40) return "D"
  return "F"
}

export function scoreRepo(
  context: RepoContext,
  checks: Check[] = registry,
): RepoScore {
  const outcomes = checks.map((check) => ({
    check,
    result: check.run(context),
  }))

  // A check that does not apply is removed from the denominator entirely.
  // Counting it as a failure would penalise a Python library for having no
  // deployed URL; counting it as a pass would inflate the score for a rule
  // the repo never had to satisfy.
  const applicable = outcomes.filter((o) => o.result !== "na")

  const possible = applicable.reduce((total, o) => total + o.check.weight, 0)
  const earned = applicable
    .filter((o) => o.result === "pass")
    .reduce((total, o) => total + o.check.weight, 0)

  // Grading on the rounded figure keeps the letter predictable from the
  // number on screen. 89.6 shows as 90 and should not read as a B.
  // Every check coming back na leaves nothing to fix, so the repo is not
  // penalised. Unreachable with the real registry, where twelve of the
  // thirteen checks always apply.
  const score = possible === 0 ? 100 : Math.round((earned / possible) * 100)

  return {
    repo: context.repo,
    outcomes,
    earned,
    possible,
    score,
    grade: gradeFor(score),
  }
}

export interface AccountScore {
  score: number
  grade: Grade
  repos: RepoScore[]
}

/**
 * A plain mean across repos. Deliberately not weighted by repo size,
 * stars, or recency: users need to be able to predict this number, and
 * every clever version of it stops being predictable.
 */
export function scoreAccount(repos: RepoScore[]): AccountScore {
  if (repos.length === 0) {
    return { score: 0, grade: "F", repos }
  }

  const total = repos.reduce((sum, repo) => sum + repo.score, 0)
  const score = Math.round(total / repos.length)

  return { score, grade: gradeFor(score), repos }
}

/**
 * Outcomes split three ways and ordered for reading.
 *
 * Failures come first and heaviest first, because the report is a work
 * queue: the fix worth the most points should be the first line you see.
 * Ties break on title so the order is stable between renders and between
 * repos. Not-applicable checks go last, and quietly, since there is
 * nothing to do about them.
 */
export function partitionOutcomes(outcomes: CheckOutcome[]): {
  failed: CheckOutcome[]
  passed: CheckOutcome[]
  notApplicable: CheckOutcome[]
} {
  const byPointsLost = (a: CheckOutcome, b: CheckOutcome) =>
    b.check.weight - a.check.weight || a.check.title.localeCompare(b.check.title)

  return {
    failed: outcomes.filter((o) => o.result === "fail").sort(byPointsLost),
    passed: outcomes.filter((o) => o.result === "pass").sort(byPointsLost),
    notApplicable: outcomes.filter((o) => o.result === "na"),
  }
}

/**
 * Repos in the order the account view shows them: lowest score first,
 * ties broken by name so the order is stable. Worst first is deliberate.
 * The page is a work queue, and the repo that costs the most is the one
 * to open first.
 */
export function rankWorstFirst(scores: RepoScore[]): RepoScore[] {
  return [...scores].sort(
    (a, b) => a.score - b.score || a.repo.name.localeCompare(b.repo.name),
  )
}
