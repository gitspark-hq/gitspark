import { recentlyUpdated } from "./recently-updated"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "./types"

function context(pushed_at: string | null): RepoContext {
  return { repo: makeRepo({ pushed_at }), readme: null, rootFiles: [] }
}

/**
 * Every test runs at a fixed instant. The rule is about the calendar, and
 * a test that used the real clock would start failing on its own one year
 * after the fixture dates were written.
 */
const NOW = new Date("2026-09-10T12:00:00Z")

describe("recently-updated", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("passes a repo pushed to last week", () => {
    expect(recentlyUpdated.run(context("2026-09-03T00:00:00Z"))).toBe("pass")
  })

  it("passes a repo pushed to eleven months ago", () => {
    expect(recentlyUpdated.run(context("2025-10-15T00:00:00Z"))).toBe("pass")
  })

  it("fails a repo pushed to thirteen months ago", () => {
    expect(recentlyUpdated.run(context("2025-08-01T00:00:00Z"))).toBe("fail")
  })

  it("fails a repo last pushed to years ago", () => {
    expect(recentlyUpdated.run(context("2021-01-01T00:00:00Z"))).toBe("fail")
  })

  it("passes at exactly twelve months to the second", () => {
    // Inclusive. A repo touched a year ago today is still "within" a year.
    expect(recentlyUpdated.run(context("2025-09-10T12:00:00Z"))).toBe("pass")
  })

  it("fails one second past twelve months", () => {
    expect(recentlyUpdated.run(context("2025-09-10T11:59:59Z"))).toBe("fail")
  })

  it("fails a repo that has never been pushed to", () => {
    expect(recentlyUpdated.run(context(null))).toBe("fail")
  })

  it("passes a repo pushed to in the future, which clock skew can produce", () => {
    // The API's clock and the visitor's clock are not the same clock. A
    // push a few minutes ahead of local time is recent, not broken.
    expect(recentlyUpdated.run(context("2026-09-10T12:05:00Z"))).toBe("pass")
  })

  it("is never not-applicable: every repo has a last push, or has none", () => {
    expect(recentlyUpdated.run(context(null))).not.toBe("na")
  })
})
