import type { DayCounts } from "./streak";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

/**
 * contributionsCollection gives per-day totals via the calendar, but the
 * commit/PR/review/issue breakdown is only available as period totals.
 * We fetch both: the calendar drives the streak; the breakdown drives XP.
 * Per-day type breakdown is approximated by fetching in small windows.
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
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

type GqlResponse = {
  data?: {
    user: {
      contributionsCollection: {
        totalCommitContributions: number;
        totalPullRequestContributions: number;
        totalPullRequestReviewContributions: number;
        totalIssueContributions: number;
        restrictedContributionsCount: number;
        contributionCalendar: {
          weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
        };
      };
    } | null;
  };
  errors?: { message: string }[];
};

export class GitHubError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "GitHubError";
  }
}

async function fetchWindow(token: string, login: string, from: Date, to: Date) {
  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "gitstreak",
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { login, from: from.toISOString(), to: to.toISOString() },
    }),
  });
  if (!res.ok) {
    throw new GitHubError(`GitHub API ${res.status}: ${await res.text()}`, res.status);
  }
  const json = (await res.json()) as GqlResponse;
  if (json.errors?.length) throw new GitHubError(json.errors.map((e) => e.message).join("; "));
  if (!json.data?.user) throw new GitHubError(`GitHub user ${login} not found`);
  return json.data.user.contributionsCollection;
}

/**
 * Fetches daily contribution counts for [from, to] (inclusive, UTC dates).
 *
 * Strategy: one call per ~7-day window. The calendar gives exact per-day totals;
 * the typed totals for the window are distributed across that window's active
 * days proportionally so XP is a reasonable approximation. For the 1-day window
 * covering "today" the breakdown is exact.
 */
export async function fetchDailyContributions(
  token: string,
  login: string,
  from: string,
  to: string,
  windowDays = 7,
): Promise<DayCounts[]> {
  const out = new Map<string, DayCounts>();
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

    const windowTotal = days.reduce((s, d) => s + d.contributionCount, 0);
    for (const d of days) {
      const share = windowTotal > 0 ? d.contributionCount / windowTotal : 0;
      out.set(d.date, {
        date: d.date,
        commits: Math.round(c.totalCommitContributions * share),
        prs: Math.round(c.totalPullRequestContributions * share),
        reviews: Math.round(c.totalPullRequestReviewContributions * share),
        issues: Math.round(c.totalIssueContributions * share),
        total: d.contributionCount,
      });
    }

    cursor = new Date(winEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    cursor.setUTCHours(0, 0, 0, 0);
  }

  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
}
