import { readmeExists } from "./readme-exists"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "./types"

function context(readme: string | null): RepoContext {
  return { repo: makeRepo(), readme, rootFiles: [] }
}

describe("readme-exists", () => {
  it("passes when the repo has a README", () => {
    expect(readmeExists.run(context("# Example\n\nWhat it does."))).toBe("pass")
  })

  it("fails when the repo has no README", () => {
    expect(readmeExists.run(context(null))).toBe("fail")
  })

  it("passes on an empty README, which exists and says nothing", () => {
    // Deliberate. Emptiness is readme-substantial's ten points to take, and
    // telling someone to add a file they already added is a wrong fix.
    expect(readmeExists.run(context(""))).toBe("pass")
  })

  it("is never not-applicable: every repo can have a README", () => {
    expect(readmeExists.run(context(null))).not.toBe("na")
  })
})
