import type { GitHubRepo } from "../types"

/**
 * "na" means the rule does not apply to this repo. A Python library is not
 * penalised for having no deployed URL. Not-applicable checks are removed
 * from the denominator rather than counted as failures.
 */
export type CheckResult = "pass" | "fail" | "na"

/** Everything a check is allowed to look at. */
export interface RepoContext {
  repo: GitHubRepo
  /** Raw README text, or null when the repo has no README. */
  readme: string | null
  /** File and directory names in the repo root. */
  rootFiles: string[]
  /**
   * Loaded lazily, because asking costs a request per repo and the release
   * check is worth two points. Undefined means "not looked up yet", which
   * is not the same as zero.
   */
  releaseCount?: number
}

export interface Check {
  /** Stable identifier. Appears in URLs and test names, so it does not change. */
  id: string
  /** Human title, sentence case: "Has a description". */
  title: string
  /** Points out of 100. */
  weight: number
  /** One sentence on why this matters. Shown when a row is expanded. */
  why: string
  /** One sentence, concrete and actionable. Never "consider improving". */
  howToFix: string
  run(context: RepoContext): CheckResult
}
