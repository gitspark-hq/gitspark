import type { DayCounts } from "./streak";
import type { RepoActivity } from "@/db/schema";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

/**
 * contributionsCollection gives exact per-day totals via the calendar, but the
 * commit/PR/review/issue breakdown (and per-repo detail) is only available as
 * totals for the requested period. So: wide windows for cheap history, 1-day
 * windows where we want exact numbers (recent days).
 */
const QUERY = /* GraphQL */ `
  query Contributions($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
        restrictedContributionsCount
        contributionCalendar {
          weeks { contributionDays { date contributionCount } }
        }
        commitContributionsByRepository(maxRepositories: 25) {
          repository { nameWithOwner isPrivate }
          contributions { totalCount }
        }
        pullRequestContributionsByRepository(maxRepositories: 25) {
          repository { nameWithOwner isPrivate }
          contributions { totalCount }
        }
        pullRequestReviewContributionsByRepository(maxRepositories: 25) {
          repository { nameWithOwner isPrivate }
          contributions { totalCount }
        }
        issueContributionsByRepository(maxRepositories: 25) {
          repository { nameWithOwner isPrivate }
          contributions { totalCount }
        }
      }
    }
  }
`;

type ByRepo = { repository: { nameWithOwner: string; isPrivate: boolean }; contributions: { totalCount: number } }[];

type Collection = {
  totalCommitContributions: number;
  totalPullRequestContributions: number;
  totalPullRequestReviewContributions: number;
  totalIssueContributions: number;
  restrictedContributionsCount: number;
  contributionCalendar: { weeks: { contributionDays: { date: string; contributionCount: number }[] }[] };
  commitContributionsByRepository: ByRepo;
  pullRequestContributionsByRepository: ByRepo;
  pullRequestReviewContributionsByRepository: ByRepo;
  issueContributionsByRepository: ByRepo;
};

type GqlResponse = {
  data?: { user: { contributionsCollection: Collection } | null };
  errors?: { message: string }[];
};

export class GitHubError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "GitHubError";
  }
}

async function fetchWindow(token: string, login: string, from: Date, to: Date): Promise<Collection> {
  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "gitstreak",
    },
    body: JSON.stringify({ query: QUERY, variables: { login, from: from.toISOString(), to: to.toISOString() } }),
  });
  if (!res.ok) throw new GitHubError(`GitHub API ${res.status}: ${await res.text()}`, res.status);
  const json = (await res.json()) as GqlResponse;
  if (json.errors?.length) throw new GitHubError(json.errors.map((e) => e.message).join("; "));
  if (!json.data?.user) throw new GitHubError(`GitHub user ${login} not found`);
  return json.data.user.contributionsCollection;
}

function mergeRepos(c: Collection): RepoActivity[] {
  const map = new Map<string, RepoActivity>();
  const add = (list: ByRepo, key: "commits" | "prs" | "reviews" | "issues") => {
    for (const r of list) {
      const name = r.repository.nameWithOwner;
      const entry = map.get(name) ?? { repo: name, isPrivate: r.repository.isPrivate, commits: 0, prs: 0, reviews: 0, issues: 0 };
      entry[key] += r.contributions.totalCount;
      map.set(name, entry);
    }
  };
  add(c.commitContributionsByRepository, "commits");
  add(c.pullRequestContributionsByRepository, "prs");
  add(c.pullRequestReviewContributionsByRepository, "reviews");
  add(c.issueContributionsByRepository, "issues");
  return [...map.values()].sort(
    (a, b) => b.commits + b.prs + b.reviews + b.issues - (a.commits + a.prs + a.reviews + a.issues),
  );
}

export type FetchedDay = DayCounts & { repos: RepoActivity[] | null; exact: boolean };

/**
 * Fetches daily contribution counts for [from, to] (inclusive, UTC dates).
 *
 * `windowDays = 1` yields exact per-day type counts and a per-repo breakdown.
 * Larger windows are cheaper: the calendar gives exact per-day totals, and the
 * window's typed totals are distributed proportionally across active days.
 */
export async function fetchDailyContributions(
  token: string,
  login: string,
  from: string,
  to: string,
  windowDays = 7,
): Promise<FetchedDay[]> {
  const out = new Map<string, FetchedDay>();
  let cursor = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T23:59:59Z");

  while (cursor <= end) {
    const winEnd = new Date(cursor);
    winEnd.setUTCDate(winEnd.getUTCDate() + windowDays - 1);
    if (winEnd > end) winEnd.setTime(end.getTime());
    winEnd.setUTCHours(23, 59, 59, 999);

    const c = await fetchWindow(token, login, cursor, winEnd);
    const days = c.contributionCalendar.weeks
      .flatMap((w) => w.contributionDays)
      .filter((d) => d.date >= from && d.date <= to);

    const exact = windowDays === 1;
    const windowTotal = days.reduce((s, d) => s + d.contributionCount, 0);
    for (const d of days) {
      const share = exact ? 1 : windowTotal > 0 ? d.contributionCount / windowTotal : 0;
      out.set(d.date, {
        date: d.date,
        commits: Math.round(c.totalCommitContributions * share),
        prs: Math.round(c.totalPullRequestContributions * share),
        reviews: Math.round(c.totalPullRequestReviewContributions * share),
        issues: Math.round(c.totalIssueContributions * share),
        total: d.contributionCount,
        repos: exact ? mergeRepos(c) : null,
        exact,
      });
    }

    cursor = new Date(winEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    cursor.setUTCHours(0, 0, 0, 0);
  }

  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
}
