import { noPlaceholderText } from "./no-placeholder-text"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "./types"

function context(readme: string | null): RepoContext {
  return { repo: makeRepo(), readme, rootFiles: [] }
}

const clean = [
  "# example",
  "",
  "A library that grades GitHub repos on presentation.",
  "",
  "## Running it",
  "",
  "    npm install",
].join("\n")

describe("no-placeholder-text", () => {
  it("passes a README with no placeholders", () => {
    expect(noPlaceholderText.run(context(clean))).toBe("pass")
  })

  it("fails on a TODO", () => {
    expect(noPlaceholderText.run(context("## TODO\n\n- write the docs"))).toBe(
      "fail",
    )
  })

  it("fails on a lowercase todo", () => {
    expect(noPlaceholderText.run(context("todo: explain the config"))).toBe(
      "fail",
    )
  })

  it("fails on FIXME", () => {
    expect(noPlaceholderText.run(context("FIXME the install steps"))).toBe(
      "fail",
    )
  })

  it("fails on TBD", () => {
    expect(noPlaceholderText.run(context("License: TBD"))).toBe("fail")
  })

  it("fails on a fill in marker", () => {
    expect(noPlaceholderText.run(context("Author: [fill in]"))).toBe("fail")
  })

  it("fails on a fill this in marker", () => {
    expect(noPlaceholderText.run(context("Author: [fill this in]"))).toBe(
      "fail",
    )
  })

  it("fails on coming soon", () => {
    expect(noPlaceholderText.run(context("Docs coming soon."))).toBe("fail")
  })

  it("fails on lorem ipsum", () => {
    expect(noPlaceholderText.run(context("Lorem ipsum dolor sit amet."))).toBe(
      "fail",
    )
  })

  it("fails on unreplaced template text", () => {
    expect(noPlaceholderText.run(context("# Your Project Name Here"))).toBe(
      "fail",
    )
  })

  it("fails on an unreplaced angle bracket placeholder", () => {
    expect(noPlaceholderText.run(context("Run <your command> to start"))).toBe(
      "fail",
    )
  })

  it("fails on a go here placeholder", () => {
    expect(noPlaceholderText.run(context("Screenshot goes here"))).toBe("fail")
  })

  it("does not apply when the repo has no README", () => {
    // There is nothing to clean up, and readme-exists already charges the
    // fifteen points for the missing file.
    expect(noPlaceholderText.run(context(null))).toBe("na")
  })

  it("passes an empty README, which has no placeholders in it", () => {
    expect(noPlaceholderText.run(context(""))).toBe("pass")
  })

  it("does not fire on a word that merely contains todo", () => {
    // Word boundaries matter: "todos" in a to-do list app's README is the
    // subject of the project, not a leftover note.
    expect(noPlaceholderText.run(context("A todos app built in React."))).toBe(
      "pass",
    )
  })

  it("does not fire on the word tbdata or similar", () => {
    expect(noPlaceholderText.run(context("Reads TBDATA export files."))).toBe(
      "pass",
    )
  })

  it("does not fire on prose about upcoming work phrased normally", () => {
    expect(
      noPlaceholderText.run(context("Version two will add a CLI. See issues.")),
    ).toBe("pass")
  })

  it("answers the same way on a second run", () => {
    expect(noPlaceholderText.run(context(clean))).toBe("pass")
    expect(noPlaceholderText.run(context(clean))).toBe("pass")
  })
})
