import { notEmptyFork } from "./not-empty-fork"
import { makeRepo } from "../test/fixtures"
import type { GitHubRepo } from "../types"
import type { RepoContext } from "./types"

function context(overrides: Partial<GitHubRepo>): RepoContext {
  return { repo: makeRepo(overrides), readme: null, rootFiles: [] }
}

const forkedAt = "2025-03-01T12:00:00Z"

describe("not-empty-fork", () => {
  it("passes a repo that is not a fork", () => {
    expect(notEmptyFork.run(context({ fork: false }))).toBe("pass")
  })

  it("passes a repo that is not a fork whatever its timestamps say", () => {
    // The timestamp heuristic is only for forks. An original repo created
    // and never pushed to is still the owner's own work.
    expect(
      notEmptyFork.run(
        context({ fork: false, created_at: forkedAt, pushed_at: forkedAt }),
      ),
    ).toBe("pass")
  })

  it("passes a fork the owner has pushed to since forking", () => {
    expect(
      notEmptyFork.run(
        context({
          fork: true,
          created_at: forkedAt,
          pushed_at: "2025-03-08T09:00:00Z",
        }),
      ),
    ).toBe("pass")
  })

  it("fails a fork whose last push predates the fork", () => {
    // pushed_at is copied from the parent at fork time, so this is what
    // an untouched fork of an older project looks like.
    expect(
      notEmptyFork.run(
        context({
          fork: true,
          created_at: forkedAt,
          pushed_at: "2024-11-20T00:00:00Z",
        }),
      ),
    ).toBe("fail")
  })

  it("fails a fork pushed to at exactly the moment it was created", () => {
    expect(
      notEmptyFork.run(
        context({ fork: true, created_at: forkedAt, pushed_at: forkedAt }),
      ),
    ).toBe("fail")
  })

  it("fails a fork that has never been pushed to at all", () => {
    expect(
      notEmptyFork.run(
        context({ fork: true, created_at: forkedAt, pushed_at: null }),
      ),
    ).toBe("fail")
  })

  it("passes a fork pushed to one second after forking", () => {
    // The comparison is strict. Any push after creation is the owner's.
    expect(
      notEmptyFork.run(
        context({
          fork: true,
          created_at: forkedAt,
          pushed_at: "2025-03-01T12:00:01Z",
        }),
      ),
    ).toBe("pass")
  })

  it("is never not-applicable: empty forks are scored, not excluded", () => {
    // Product decision, recorded in the spec's section 12 answers. An
    // untouched fork counts against the account average rather than
    // silently dropping out of it.
    expect(
      notEmptyFork.run(
        context({ fork: true, created_at: forkedAt, pushed_at: forkedAt }),
      ),
    ).not.toBe("na")
  })
})
