import { readmeHasImage } from "./readme-has-image"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "./types"

function context(readme: string | null): RepoContext {
  return { repo: makeRepo(), readme, rootFiles: [] }
}

describe("readme-has-image", () => {
  it("passes on a markdown image", () => {
    expect(
      readmeHasImage.run(context("# example\n\n![A screenshot](docs/shot.png)")),
    ).toBe("pass")
  })

  it("passes on a markdown image with empty alt text", () => {
    expect(readmeHasImage.run(context("![](shot.png)"))).toBe("pass")
  })

  it("passes on a reference style image", () => {
    const readme = "![A screenshot][shot]\n\n[shot]: docs/shot.png"
    expect(readmeHasImage.run(context(readme))).toBe("pass")
  })

  it("passes on a raw img tag", () => {
    expect(
      readmeHasImage.run(context('<img src="shot.png" width="600">')),
    ).toBe("pass")
  })

  it("passes on an img tag in any case", () => {
    expect(readmeHasImage.run(context('<IMG SRC="shot.png">'))).toBe("pass")
  })

  it("fails on a README with no image", () => {
    expect(
      readmeHasImage.run(context("# example\n\nWhat it does and how to run it.")),
    ).toBe("fail")
  })

  it("fails when the repo has no README", () => {
    expect(readmeHasImage.run(context(null))).toBe("fail")
  })

  it("does not count image syntax inside a fenced code block", () => {
    // A README teaching markdown is not a README with a screenshot.
    const readme = "Write an image like this:\n\n```md\n![alt](path.png)\n```\n"
    expect(readmeHasImage.run(context(readme))).toBe("fail")
  })

  it("does not count an img tag inside a tilde fenced block", () => {
    const readme = '~~~html\n<img src="shot.png">\n~~~\n'
    expect(readmeHasImage.run(context(readme))).toBe("fail")
  })

  it("still passes when a real image sits outside a code block", () => {
    const readme = "![Screenshot](shot.png)\n\n```md\n![alt](path.png)\n```\n"
    expect(readmeHasImage.run(context(readme))).toBe("pass")
  })

  it("does not mistake a plain link for an image", () => {
    expect(readmeHasImage.run(context("[the docs](https://example.com)"))).toBe(
      "fail",
    )
  })

  it("finds an image on the second of two runs", () => {
    // The pattern list is module scope. A lastIndex left behind by a global
    // regex would make the same input answer differently the second time.
    const readme = "![Screenshot](shot.png)"
    expect(readmeHasImage.run(context(readme))).toBe("pass")
    expect(readmeHasImage.run(context(readme))).toBe("pass")
  })
})
