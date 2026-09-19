import { partitionOutcomes, rankWorstFirst, type RepoScore } from "./scoring"
import type { Check } from "./checks"

/** One rule failing across the account, with what it is costing in total. */
export interface Pattern {
  check: Check
  /** Repos failing this check. */
  count: number
  /** Repos the check applied to. */
  applicable: number
  /** weight × count. What fixing it everywhere is worth. */
  pointsLost: number
}

/** The single most valuable fix on the account. */
export interface FirstFix {
  repoName: string
  check: Check
}

export interface Findings {
  patterns: Pattern[]
  firstFix: FirstFix | null
}

/** How many patterns are worth naming. Past three it stops being a summary. */
const MAX_PATTERNS = 3

/**
 * What the account keeps getting wrong, from the scores already on the
 * page. Counting, not judgement: "nine of thirteen repos have no
 * screenshot" is a fact anyone can check by scrolling, which is what
 * makes it worth saying at the top.
 *
 * Patterns rank by points lost across the account, not by how many repos
 * fail, so a fifteen point rule failing on four repos outranks a two
 * point rule failing on ten. The first fix is the heaviest failure on
 * the worst repo, because that is where the queue starts.
 */
export function findAccountPatterns(scores: RepoScore[]): Findings {
  const byCheck = new Map<string, Pattern>()

  for (const score of scores) {
    for (const outcome of score.outcomes) {
      if (outcome.result === "na") continue
      const existing = byCheck.get(outcome.check.id)
      const pattern = existing ?? {
        check: outcome.check,
        count: 0,
        applicable: 0,
        pointsLost: 0,
      }
      pattern.applicable += 1
      if (outcome.result === "fail") {
        pattern.count += 1
        pattern.pointsLost += outcome.check.weight
      }
      byCheck.set(outcome.check.id, pattern)
    }
  }

  const patterns = [...byCheck.values()]
    .filter((pattern) => pattern.count > 0)
    .sort(
      (a, b) =>
        b.pointsLost - a.pointsLost ||
        b.count - a.count ||
        a.check.title.localeCompare(b.check.title),
    )
    .slice(0, MAX_PATTERNS)

  const worst = rankWorstFirst(scores)[0]
  const heaviest = worst ? partitionOutcomes(worst.outcomes).failed[0] : undefined
  const firstFix = worst && heaviest ? { repoName: worst.repo.name, check: heaviest.check } : null

  return { patterns, firstFix }
}

/** "9 of 13 repos" or "1 of 13 repos", with the right plural. */
export function describePattern(pattern: Pattern): string {
  const noun = pattern.applicable === 1 ? "repo" : "repos"
  return `${pattern.count} of ${pattern.applicable} ${noun}`
}
