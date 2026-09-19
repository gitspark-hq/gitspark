import type { GitHubContentEntry, GitHubRepo } from "./types";
import type { RepoContext } from "./checks";
import { GitHubError } from "@/lib/github";

const API_BASE = "https://api.github.com";
const PER_PAGE = 100;

/**
 * Repos fetched at once. ~3 requests per repo, and GitHub applies a secondary
 * limit to concurrent requests on top of the hourly budget.
 */
const CONCURRENCY = 4;

async function request(token: string, url: string, accept = "application/vnd.github+json"): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      Accept: accept,
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gitspark",
    },
  });
  if (res.ok || res.status === 404) return res;
  if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
    throw new GitHubError("GitHub's rate limit is used up. Try again in an hour.", 429);
  }
  throw new GitHubError(`GitHub returned ${res.status} for ${url}`, res.status);
}

/** Public, non-archived repos for a user — what a recruiter sees on the profile. */
export async function fetchPublicRepos(token: string, login: string): Promise<GitHubRepo[]> {
  const out: GitHubRepo[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await request(
      token,
      `${API_BASE}/users/${encodeURIComponent(login)}/repos?per_page=${PER_PAGE}&sort=pushed&type=owner&page=${page}`,
    );
    if (res.status === 404) throw new GitHubError(`GitHub user ${login} not found`, 404);
    const batch = (await res.json()) as GitHubRepo[];
    out.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return out.filter((r) => !r.archived);
}

async function fetchReadme(token: string, owner: string, repo: string): Promise<string | null> {
  const res = await request(
    token,
    `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
    "application/vnd.github.raw",
  );
  return res.status === 404 ? null : res.text();
}

async function fetchRootFiles(token: string, owner: string, repo: string): Promise<string[]> {
  const res = await request(token, `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/`);
  if (res.status === 404) return [];
  const entries = (await res.json()) as GitHubContentEntry[];
  return entries.map((e) => e.name);
}

async function fetchReleaseCount(token: string, owner: string, repo: string): Promise<number> {
  const res = await request(
    token,
    `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=1`,
  );
  if (res.status === 404) return 0;
  return ((await res.json()) as unknown[]).length;
}

/**
 * Everything the checks need for each repo, a few at a time. Unlike the
 * browser version, releases are fetched eagerly: results are cached in the
 * DB so the extra request per repo is paid once, not per page view.
 */
export async function loadRepoContexts(token: string, repos: GitHubRepo[]): Promise<RepoContext[]> {
  const contexts: RepoContext[] = new Array(repos.length);
  let next = 0;

  async function worker() {
    while (next < repos.length) {
      const i = next++;
      const repo = repos[i];
      const [readme, rootFiles, releaseCount] = await Promise.all([
        fetchReadme(token, repo.owner.login, repo.name),
        fetchRootFiles(token, repo.owner.login, repo.name),
        fetchReleaseCount(token, repo.owner.login, repo.name),
      ]);
      contexts[i] = { repo, readme, rootFiles, releaseCount };
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, repos.length) }, worker));
  return contexts;
}
