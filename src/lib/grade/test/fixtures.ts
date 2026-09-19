import type { GitHubRepo } from "../types"

let nextId = 1

/**
 * A repo that passes nothing in particular. Tests override only the fields
 * they care about, so a check's test reads as a statement about that one
 * field.
 */
export function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    id: nextId++,
    name: "example",
    full_name: "octocat/example",
    owner: { login: "octocat" },
    html_url: "https://github.com/octocat/example",
    description: null,
    fork: false,
    archived: false,
    homepage: null,
    topics: [],
    license: null,
    stargazers_count: 0,
    pushed_at: "2025-06-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    default_branch: "main",
    ...overrides,
  }
}
