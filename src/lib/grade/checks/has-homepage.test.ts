import { hasHomepage } from "./has-homepage";
import { makeRepo } from "../test/fixtures";
import type { RepoContext } from "./types";

function context(homepage: string | null, rootFiles: string[]): RepoContext {
  return { repo: makeRepo({ homepage }), readme: null, rootFiles };
}

describe("has-homepage", () => {
  it("passes a web project with a homepage", () => {
    expect(
      hasHomepage.run(context("https://example.com", ["package.json"])),
    ).toBe("pass");
  });

  it("fails a web project with no homepage", () => {
    expect(hasHomepage.run(context(null, ["package.json"]))).toBe("fail");
  });

  it("fails a web project whose homepage is an empty string", () => {
    // GitHub returns "" rather than null when the field was cleared.
    expect(hasHomepage.run(context("", ["index.html"]))).toBe("fail");
  });

  it("fails a web project whose homepage is only whitespace", () => {
    expect(hasHomepage.run(context("   ", ["index.html"]))).toBe("fail");
  });

  it("treats index.html in the root as a web project", () => {
    expect(hasHomepage.run(context(null, ["index.html", "style.css"]))).toBe(
      "fail",
    );
  });

  it("does not apply to a repo with neither marker", () => {
    // The case na exists for. A Python library is not penalised for
    // having no deployed URL.
    expect(
      hasHomepage.run(context(null, ["setup.py", "README.md", "src"])),
    ).toBe("na");
  });

  it("does not apply to an empty repo", () => {
    expect(hasHomepage.run(context(null, []))).toBe("na");
  });

  it("does not apply even when a non web repo happens to have a homepage", () => {
    // Not applicable means not scored either way. Giving a library free
    // points for a docs link would make the denominator depend on luck.
    expect(
      hasHomepage.run(context("https://docs.example.com", ["Cargo.toml"])),
    ).toBe("na");
  });

  it("only looks at the root, not nested paths", () => {
    // rootFiles holds bare names. A package.json inside a docs folder
    // would never appear here, and a name that merely contains the marker
    // is not the marker.
    expect(hasHomepage.run(context(null, ["package.json.bak"]))).toBe("na");
  });
});
