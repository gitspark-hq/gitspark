import { checks } from "./index"

describe("the check registry", () => {
  it("has no duplicate ids", () => {
    const ids = checks.map((check) => check.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("gives every check a positive weight", () => {
    for (const check of checks) {
      expect(check.weight).toBeGreaterThan(0)
    }
  })

  it("gives every check the prose the report card needs", () => {
    for (const check of checks) {
      expect(check.title.length).toBeGreaterThan(0)
      expect(check.why.length).toBeGreaterThan(0)
      expect(check.howToFix.length).toBeGreaterThan(0)
    }
  })
})
