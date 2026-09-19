import { hasRelease } from "./has-release"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "./types"

function context(releaseCount?: number): RepoContext {
  return { repo: makeRepo(), readme: null, rootFiles: [], releaseCount }
}

describe("has-release", () => {
  it("passes when the repo has at least one release", () => {
    expect(hasRelease.run(context(1))).toBe("pass")
  })

  it("passes on many releases", () => {
    expect(hasRelease.run(context(14))).toBe("pass")
  })

  it("fails when the repo has none", () => {
    expect(hasRelease.run(context(0))).toBe("fail")
  })

  it("does not apply until the count has been looked up", () => {
    // The lookup costs a request per repo and lands after first paint. A
    // repo that has not been asked yet is not a repo with no releases.
    expect(hasRelease.run(context(undefined))).toBe("na")
  })

  it("is the only check whose applicability depends on data being loaded", () => {
    // Documents the shape rather than the rule: with the count present
    // this check always applies, so the score is out of 100 once it lands.
    expect(hasRelease.run(context(0))).not.toBe("na")
    expect(hasRelease.run(context(1))).not.toBe("na")
  })
})
