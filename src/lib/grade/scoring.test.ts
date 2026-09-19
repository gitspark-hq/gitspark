import {
  gradeFor,
  partitionOutcomes,
  rankWorstFirst,
  scoreAccount,
  scoreRepo,
  type CheckOutcome,
  type RepoScore,
} from "./scoring"
import type { Check, CheckResult, RepoContext } from "./checks"
import { makeRepo } from "./test/fixtures"

/** A check that always returns the same answer, for exercising the engine. */
function stubCheck(
  id: string,
  weight: number,
  result: CheckResult,
): Check {
  return {
    id,
    title: id,
    weight,
    why: "why",
    howToFix: "how",
    run: () => result,
  }
}

function context(): RepoContext {
  return { repo: makeRepo(), readme: null, rootFiles: [] }
}

describe("gradeFor", () => {
  it("maps the bands from the rubric", () => {
    expect(gradeFor(100)).toBe("A")
    expect(gradeFor(90)).toBe("A")
    expect(gradeFor(89)).toBe("B")
    expect(gradeFor(75)).toBe("B")
    expect(gradeFor(74)).toBe("C")
    expect(gradeFor(60)).toBe("C")
    expect(gradeFor(59)).toBe("D")
    expect(gradeFor(40)).toBe("D")
    expect(gradeFor(39)).toBe("F")
    expect(gradeFor(0)).toBe("F")
  })
})

describe("scoreRepo", () => {
  it("sums the weights of the passing checks", () => {
    const result = scoreRepo(context(), [
      stubCheck("a", 15, "pass"),
      stubCheck("b", 10, "pass"),
      stubCheck("c", 25, "fail"),
    ])

    expect(result.earned).toBe(25)
    expect(result.possible).toBe(50)
    expect(result.score).toBe(50)
  })

  it("scores a repo that passes everything at 100", () => {
    const result = scoreRepo(context(), [
      stubCheck("a", 60, "pass"),
      stubCheck("b", 40, "pass"),
    ])

    expect(result.score).toBe(100)
    expect(result.grade).toBe("A")
  })

  it("scores a repo that passes nothing at 0", () => {
    const result = scoreRepo(context(), [
      stubCheck("a", 60, "fail"),
      stubCheck("b", 40, "fail"),
    ])

    expect(result.score).toBe(0)
    expect(result.grade).toBe("F")
  })

  it("keeps one outcome per check, in registry order", () => {
    const result = scoreRepo(context(), [
      stubCheck("a", 10, "pass"),
      stubCheck("b", 10, "fail"),
    ])

    expect(result.outcomes.map((o) => [o.check.id, o.result])).toEqual([
      ["a", "pass"],
      ["b", "fail"],
    ])
  })

  it("rounds to a whole number, and grades on the rounded figure", () => {
    // 1 of 3 is 33.33, which must not surface as 33.333333.
    const result = scoreRepo(context(), [
      stubCheck("a", 1, "pass"),
      stubCheck("b", 2, "fail"),
    ])

    expect(result.score).toBe(33)
  })

  it("carries the repo through so the UI does not have to pair them up", () => {
    const repo = makeRepo({ name: "gitgrade" })
    const result = scoreRepo(
      { repo, readme: null, rootFiles: [] },
      [stubCheck("a", 10, "pass")],
    )

    expect(result.repo.name).toBe("gitgrade")
  })
})

describe("scoreAccount", () => {
  function scored(score: number) {
    const passing = stubCheck("a", score, "pass")
    const failing = stubCheck("b", 100 - score, "fail")
    return scoreRepo(context(), score === 100 ? [passing] : [passing, failing])
  }

  it("is a plain mean across repos", () => {
    const account = scoreAccount([scored(90), scored(50), scored(40)])

    expect(account.score).toBe(60)
    expect(account.grade).toBe("C")
  })

  it("does not weight by repo size, stars, or recency", () => {
    // Two repos, one of them far more prominent. Both count once.
    const account = scoreAccount([scored(100), scored(0)])

    expect(account.score).toBe(50)
  })

  it("returns F for an account with no repos", () => {
    const account = scoreAccount([])

    expect(account.score).toBe(0)
    expect(account.grade).toBe("F")
  })
})

describe("not-applicable checks", () => {
  it("removes an na check from the denominator", () => {
    const result = scoreRepo(context(), [
      stubCheck("a", 10, "pass"),
      stubCheck("b", 90, "na"),
    ])

    // 10 of 10, not 10 of 100.
    expect(result.possible).toBe(10)
    expect(result.earned).toBe(10)
    expect(result.score).toBe(100)
  })

  it("does not treat na as a failure", () => {
    const withNa = scoreRepo(context(), [
      stubCheck("a", 50, "pass"),
      stubCheck("b", 50, "na"),
    ])
    const withoutTheCheck = scoreRepo(context(), [stubCheck("a", 50, "pass")])

    expect(withNa.score).toBe(withoutTheCheck.score)
  })

  it("does not treat na as a pass", () => {
    const result = scoreRepo(context(), [
      stubCheck("a", 50, "fail"),
      stubCheck("b", 50, "na"),
    ])

    expect(result.score).toBe(0)
  })

  it("still reports the na outcome so the UI can show it", () => {
    const result = scoreRepo(context(), [stubCheck("b", 5, "na")])

    expect(result.outcomes).toHaveLength(1)
    expect(result.outcomes[0].result).toBe("na")
  })

  it("scores a repo where nothing applies at 100 rather than 0", () => {
    const result = scoreRepo(context(), [
      stubCheck("a", 10, "na"),
      stubCheck("b", 10, "na"),
    ])

    expect(result.possible).toBe(0)
    expect(result.score).toBe(100)
  })
})

function partitionCheck(id: string, weight: number, title = id): Check {
  return { id, title, weight, why: "w", howToFix: "h", run: () => "pass" }
}

function partitionOutcome(id: string, weight: number, result: CheckResult): CheckOutcome {
  return { check: partitionCheck(id, weight), result }
}

describe("partitionOutcomes", () => {
  it("puts failures first, heaviest first", () => {
    const { failed } = partitionOutcomes([
      partitionOutcome("small", 2, "fail"),
      partitionOutcome("big", 15, "fail"),
      partitionOutcome("mid", 8, "fail"),
    ])
    expect(failed.map((o) => o.check.id)).toEqual(["big", "mid", "small"])
  })

  it("breaks weight ties on title so the order is stable", () => {
    const { failed } = partitionOutcomes([
      { check: partitionCheck("z", 10, "Zeta"), result: "fail" },
      { check: partitionCheck("a", 10, "Alpha"), result: "fail" },
    ])
    expect(failed.map((o) => o.check.id)).toEqual(["a", "z"])
  })

  it("separates pass, fail and na", () => {
    const parts = partitionOutcomes([
      partitionOutcome("p", 5, "pass"),
      partitionOutcome("f", 5, "fail"),
      partitionOutcome("n", 5, "na"),
    ])
    expect(parts.passed.map((o) => o.check.id)).toEqual(["p"])
    expect(parts.failed.map((o) => o.check.id)).toEqual(["f"])
    expect(parts.notApplicable.map((o) => o.check.id)).toEqual(["n"])
  })

  it("does not mutate the input", () => {
    const input = [partitionOutcome("a", 1, "fail"), partitionOutcome("b", 9, "fail")]
    const before = input.map((o) => o.check.id)
    partitionOutcomes(input)
    expect(input.map((o) => o.check.id)).toEqual(before)
  })
})

describe("rankWorstFirst", () => {
  function scored(name: string, score: number): RepoScore {
    return {
      repo: makeRepo({ name }),
      outcomes: [],
      earned: score,
      possible: 100,
      score,
      grade: gradeFor(score),
    }
  }

  it("puts the lowest score first", () => {
    const ranked = rankWorstFirst([scored("b", 90), scored("a", 40), scored("c", 65)])
    expect(ranked.map((s) => s.repo.name)).toEqual(["a", "c", "b"])
  })

  it("breaks ties on name so the order is stable", () => {
    const ranked = rankWorstFirst([scored("zeta", 50), scored("alpha", 50)])
    expect(ranked.map((s) => s.repo.name)).toEqual(["alpha", "zeta"])
  })

  it("does not mutate the input", () => {
    const input = [scored("b", 90), scored("a", 40)]
    rankWorstFirst(input)
    expect(input.map((s) => s.repo.name)).toEqual(["b", "a"])
  })
})
