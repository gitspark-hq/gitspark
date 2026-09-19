import { hasDescription } from "./has-description"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "./types"

function context(description: string | null): RepoContext {
  return { repo: makeRepo({ description }), readme: null, rootFiles: [] }
}

describe("has-description", () => {
  it("passes when the repo has a description", () => {
    expect(hasDescription.run(context("Grades GitHub profiles"))).toBe("pass")
  })

  it("fails when the description is null", () => {
    expect(hasDescription.run(context(null))).toBe("fail")
  })

  it("fails when the description is an empty string", () => {
    expect(hasDescription.run(context(""))).toBe("fail")
  })

  it("fails when the description is only whitespace", () => {
    expect(hasDescription.run(context("   \n  "))).toBe("fail")
  })

  it("passes on a single character description", () => {
    // Thin, but the rule is presence. Judging the wording is a different
    // product, and not one this check is trying to be.
    expect(hasDescription.run(context("x"))).toBe("pass")
  })

  it("is never not-applicable: every repo can have a description", () => {
    expect(hasDescription.run(context(null))).not.toBe("na")
  })
})
