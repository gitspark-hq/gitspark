import { hasTopics } from "./has-topics"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "./types"

function context(topics: string[]): RepoContext {
  return { repo: makeRepo({ topics }), readme: null, rootFiles: [] }
}

describe("has-topics", () => {
  it("passes when the repo has topics", () => {
    expect(hasTopics.run(context(["react", "typescript"]))).toBe("pass")
  })

  it("passes on a single topic", () => {
    expect(hasTopics.run(context(["react"]))).toBe("pass")
  })

  it("fails when there are no topics", () => {
    expect(hasTopics.run(context([]))).toBe("fail")
  })

  it("is never not-applicable: every repo can have topics", () => {
    expect(hasTopics.run(context([]))).not.toBe("na")
  })
})
