import { readmeHasRunSteps } from "./readme-has-run-steps"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "./types"

function context(readme: string | null): RepoContext {
  return { repo: makeRepo(), readme, rootFiles: [] }
}

describe("readme-has-run-steps", () => {
  it("passes on a fenced block with npm commands", () => {
    const readme = "## Running it\n\n```bash\nnpm install\nnpm run dev\n```\n"
    expect(readmeHasRunSteps.run(context(readme))).toBe("pass")
  })

  it("passes on a fenced block with no language tag", () => {
    expect(readmeHasRunSteps.run(context("```\nnpm install\n```\n"))).toBe(
      "pass",
    )
  })

  it("passes on a tilde fenced block", () => {
    expect(readmeHasRunSteps.run(context("~~~sh\ncargo run\n~~~\n"))).toBe(
      "pass",
    )
  })

  it("passes on a four space indented block", () => {
    // GitGrade's own README is written this way. A check that only read
    // fences would fail a repo that does show its commands.
    const readme = "## Running it\n\n    npm install\n    npm run dev\n"
    expect(readmeHasRunSteps.run(context(readme))).toBe("pass")
  })

  it("passes on a tab indented block", () => {
    expect(readmeHasRunSteps.run(context("\tpip install -r reqs.txt\n"))).toBe(
      "pass",
    )
  })

  it("fails on a README with no code at all", () => {
    const readme = "# example\n\nA library for grading things. Written in Rust."
    expect(readmeHasRunSteps.run(context(readme))).toBe("fail")
  })

  it("fails when the repo has no README", () => {
    expect(readmeHasRunSteps.run(context(null))).toBe("fail")
  })

  it("fails when a run command appears only in prose", () => {
    // The rule is that the commands are in a code block, where they can be
    // copied. Prose telling you to run npm install is not that.
    expect(readmeHasRunSteps.run(context("Just run npm install first."))).toBe(
      "fail",
    )
  })

  it("fails on a code block that is only example output", () => {
    const readme = "```\nScore: 84\nGrade: B\n```\n"
    expect(readmeHasRunSteps.run(context(readme))).toBe("fail")
  })

  it("fails on a code block of source code rather than commands", () => {
    const readme = "```ts\nexport const total = 100\n```\n"
    expect(readmeHasRunSteps.run(context(readme))).toBe("fail")
  })

  it("recognises a Python entry point", () => {
    expect(readmeHasRunSteps.run(context("```\npython main.py\n```"))).toBe(
      "pass",
    )
  })

  it("recognises a Go run command", () => {
    expect(readmeHasRunSteps.run(context("```\ngo run ./cmd/api\n```"))).toBe(
      "pass",
    )
  })

  it("recognises docker compose", () => {
    expect(readmeHasRunSteps.run(context("```\ndocker compose up\n```"))).toBe(
      "pass",
    )
  })

  it("recognises a bare make", () => {
    expect(readmeHasRunSteps.run(context("```\nmake\n```"))).toBe("pass")
  })

  it("recognises a git clone as the first install step", () => {
    const readme = "```\ngit clone https://github.com/octocat/example\n```"
    expect(readmeHasRunSteps.run(context(readme))).toBe("pass")
  })

  it("answers the same way on a second run", () => {
    // The block patterns are global and live at module scope, so a lastIndex
    // carried between calls would make this flake.
    const readme = "```bash\nnpm install\n```\n"
    expect(readmeHasRunSteps.run(context(readme))).toBe("pass")
    expect(readmeHasRunSteps.run(context(readme))).toBe("pass")
  })

  it("reads GitGrade's own README as explaining how to run it", () => {
    const readme = [
      "# GitGrade",
      "",
      "See your GitHub the way a recruiter sees it.",
      "",
      "## Running it",
      "",
      "    npm install",
      "    npm run dev",
      "",
    ].join("\n")
    expect(readmeHasRunSteps.run(context(readme))).toBe("pass")
  })
})
