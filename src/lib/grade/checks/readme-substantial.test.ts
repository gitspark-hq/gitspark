import { readmeSubstantial } from "./readme-substantial"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "./types"

function context(readme: string | null, name = "example"): RepoContext {
  return { repo: makeRepo({ name }), readme, rootFiles: [] }
}

/** Prose of an exact length, so the threshold is tested at its edges. */
function prose(length: number): string {
  return "a".repeat(length)
}

describe("readme-substantial", () => {
  it("passes a README well over the threshold", () => {
    expect(readmeSubstantial.run(context(prose(1200)))).toBe("pass")
  })

  it("fails a one line README", () => {
    expect(readmeSubstantial.run(context("# example\n"))).toBe("fail")
  })

  it("fails when the repo has no README", () => {
    expect(readmeSubstantial.run(context(null))).toBe("fail")
  })

  it("passes at exactly 400 characters", () => {
    expect(readmeSubstantial.run(context(prose(400)))).toBe("pass")
  })

  it("fails at 399 characters", () => {
    expect(readmeSubstantial.run(context(prose(399)))).toBe("fail")
  })

  it("ignores surrounding whitespace when measuring", () => {
    expect(readmeSubstantial.run(context(`\n\n  ${prose(399)}  \n\n`))).toBe(
      "fail",
    )
  })

  it("does not count the repo name toward the total", () => {
    // The case the rule exists for: padding to length by repeating the name.
    const padded = "gitgrade ".repeat(60)
    expect(padded.length).toBeGreaterThan(400)
    expect(readmeSubstantial.run(context(padded, "gitgrade"))).toBe("fail")
  })

  it("strips the repo name whatever its case", () => {
    const padded = "GitGrade ".repeat(60)
    expect(readmeSubstantial.run(context(padded, "gitgrade"))).toBe("fail")
  })

  it("treats a repo name with regex characters as literal text", () => {
    // A name like "node.js" would otherwise match any character in place
    // of the dot and strip far more than the name.
    const readme = `nodexjs ${prose(500)}`
    expect(readmeSubstantial.run(context(readme, "node.js"))).toBe("pass")
  })

  it("passes real prose that happens to mention the repo name", () => {
    const readme = `# example\n\n${prose(500)} example ${prose(200)}`
    expect(readmeSubstantial.run(context(readme))).toBe("pass")
  })
})
