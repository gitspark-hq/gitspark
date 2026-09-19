import { describePattern, findAccountPatterns } from "./accountFindings"
import type { Check, CheckResult } from "./checks"
import { gradeFor, type CheckOutcome, type RepoScore } from "./scoring"
import { makeRepo } from "./test/fixtures"

function check(id: string, weight: number, title = id): Check {
  return { id, title, weight, why: "w", howToFix: "h", run: () => "pass" }
}

const readme = check("readme-exists", 15, "Has a README")
const image = check("readme-has-image", 10, "README has an image")
const gitignore = check("has-gitignore", 2, "Has a .gitignore")
const homepage = check("has-homepage", 5, "Live link for a web project")

function repo(name: string, results: [Check, CheckResult][]): RepoScore {
  const outcomes: CheckOutcome[] = results.map(([c, result]) => ({ check: c, result }))
  const applicable = outcomes.filter((o) => o.result !== "na")
  const possible = applicable.reduce((t, o) => t + o.check.weight, 0)
  const earned = applicable.filter((o) => o.result === "pass").reduce((t, o) => t + o.check.weight, 0)
  const score = possible === 0 ? 100 : Math.round((earned / possible) * 100)
  return { repo: makeRepo({ name }), outcomes, earned, possible, score, grade: gradeFor(score) }
}

describe("findAccountPatterns", () => {
  it("counts how many repos fail each check, out of those it applied to", () => {
    const { patterns } = findAccountPatterns([
      repo("a", [[image, "fail"], [homepage, "na"]]),
      repo("b", [[image, "fail"], [homepage, "fail"]]),
      repo("c", [[image, "pass"], [homepage, "pass"]]),
    ])
    const img = patterns.find((p) => p.check.id === "readme-has-image")!
    expect(img.count).toBe(2)
    expect(img.applicable).toBe(3)
    const home = patterns.find((p) => p.check.id === "has-homepage")!
    expect(home.count).toBe(1)
    expect(home.applicable).toBe(2)
  })

  it("ranks patterns by points lost across the account, not by how many repos fail", () => {
    // gitignore fails on three repos for 6 points; readme fails on one for 15.
    const { patterns } = findAccountPatterns([
      repo("a", [[readme, "fail"], [gitignore, "fail"]]),
      repo("b", [[readme, "pass"], [gitignore, "fail"]]),
      repo("c", [[readme, "pass"], [gitignore, "fail"]]),
    ])
    expect(patterns.map((p) => p.check.id)).toEqual(["readme-exists", "has-gitignore"])
    expect(patterns[0].pointsLost).toBe(15)
    expect(patterns[1].pointsLost).toBe(6)
  })

  it("names at most three patterns", () => {
    const many = Array.from({ length: 6 }, (_, i) => check(`c${i}`, 5 - (i % 5)))
    const { patterns } = findAccountPatterns([repo("a", many.map((c) => [c, "fail"]))])
    expect(patterns).toHaveLength(3)
  })

  it("leaves out checks that pass everywhere", () => {
    const { patterns } = findAccountPatterns([
      repo("a", [[readme, "pass"], [image, "fail"]]),
    ])
    expect(patterns.map((p) => p.check.id)).toEqual(["readme-has-image"])
  })

  it("picks the heaviest failure on the worst repo as the first fix", () => {
    const { firstFix } = findAccountPatterns([
      repo("fine", [[readme, "pass"], [image, "fail"]]),
      repo("bad", [[readme, "fail"], [image, "fail"], [gitignore, "fail"]]),
    ])
    expect(firstFix).toEqual({ repoName: "bad", check: readme })
  })

  it("has no first fix when nothing fails anywhere", () => {
    const { firstFix, patterns } = findAccountPatterns([repo("a", [[readme, "pass"]])])
    expect(firstFix).toBeNull()
    expect(patterns).toEqual([])
  })

  it("has no first fix on an empty account", () => {
    expect(findAccountPatterns([])).toEqual({ patterns: [], firstFix: null })
  })

  it("breaks a points tie by how many repos fail, then by title", () => {
    const five = check("five", 5, "Beta")
    const alsoFive = check("also", 5, "Alpha")
    const { patterns } = findAccountPatterns([
      repo("a", [[five, "fail"], [alsoFive, "fail"]]),
    ])
    expect(patterns.map((p) => p.check.title)).toEqual(["Alpha", "Beta"])
  })

  it("does not mutate the scores", () => {
    const scores = [repo("a", [[readme, "fail"], [image, "pass"]])]
    const before = JSON.stringify(scores)
    findAccountPatterns(scores)
    expect(JSON.stringify(scores)).toBe(before)
  })
})

describe("describePattern", () => {
  it("reads as a fraction of the repos it applied to", () => {
    expect(describePattern({ check: image, count: 9, applicable: 13, pointsLost: 90 })).toBe(
      "9 of 13 repos",
    )
  })

  it("uses the singular for one repo", () => {
    expect(describePattern({ check: image, count: 1, applicable: 1, pointsLost: 10 })).toBe(
      "1 of 1 repo",
    )
  })
})
