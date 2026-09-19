import { hasGitignore } from "./has-gitignore"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "./types"

function context(rootFiles: string[]): RepoContext {
  return { repo: makeRepo(), readme: null, rootFiles }
}

describe("has-gitignore", () => {
  it("passes when .gitignore is in the root", () => {
    expect(
      hasGitignore.run(context(["README.md", ".gitignore", "src"])),
    ).toBe("pass")
  })

  it("fails when the root has no .gitignore", () => {
    expect(hasGitignore.run(context(["README.md", "src"]))).toBe("fail")
  })

  it("fails on an empty repo", () => {
    expect(hasGitignore.run(context([]))).toBe("fail")
  })

  it("does not accept a similarly named file", () => {
    // .gitignore_global, .gitignore.example and gitignore are all things
    // people commit by mistake, and git ignores every one of them.
    expect(
      hasGitignore.run(context([".gitignore_global", "gitignore", ".gitignore.example"])),
    ).toBe("fail")
  })

  it("is case sensitive, because git is", () => {
    expect(hasGitignore.run(context([".GitIgnore"]))).toBe("fail")
  })

  it("is never not-applicable: every repo can ignore something", () => {
    expect(hasGitignore.run(context([]))).not.toBe("na")
  })
})
