import { hasLicense } from "./has-license"
import { makeRepo } from "../test/fixtures"
import type { GitHubLicense } from "../types"
import type { RepoContext } from "./types"

function context(license: GitHubLicense | null): RepoContext {
  return { repo: makeRepo({ license }), readme: null, rootFiles: [] }
}

const mit: GitHubLicense = {
  key: "mit",
  name: "MIT License",
  spdx_id: "MIT",
}

describe("has-license", () => {
  it("passes when the repo has a recognised license", () => {
    expect(hasLicense.run(context(mit))).toBe("pass")
  })

  it("fails when the repo has no license", () => {
    expect(hasLicense.run(context(null))).toBe("fail")
  })

  it("passes on a license GitHub could not identify", () => {
    // GitHub reports "other" with a null spdx_id for a LICENSE file it does
    // not recognise. The repo has still stated its terms, which is the rule.
    const other: GitHubLicense = { key: "other", name: "Other", spdx_id: null }
    expect(hasLicense.run(context(other))).toBe("pass")
  })

  it("passes on a license with a NOASSERTION spdx id", () => {
    const noassertion: GitHubLicense = {
      key: "other",
      name: "Other",
      spdx_id: "NOASSERTION",
    }
    expect(hasLicense.run(context(noassertion))).toBe("pass")
  })

  it("is never not-applicable: every repo can state its terms", () => {
    expect(hasLicense.run(context(null))).not.toBe("na")
  })

  it("ignores the README, which is not where licenses live", () => {
    const withReadme: RepoContext = {
      repo: makeRepo({ license: null }),
      readme: "Licensed under MIT.",
      rootFiles: ["LICENSE"],
    }
    // A line of prose is not a license file, and GitHub not reporting one
    // is the answer this check trusts.
    expect(hasLicense.run(withReadme)).toBe("fail")
  })
})
