import { eq } from "drizzle-orm";
import { db } from "@/db";
import { repoGrades, users, type StoredRepoScore } from "@/db/schema";
import { getGitHubToken } from "@/lib/sync";
import { GitHubError } from "@/lib/github";
import { checks } from "./checks";
import { fetchPublicRepos, loadRepoContexts } from "./fetch";
import { scoreAccount, scoreRepo, type CheckOutcome, type RepoScore } from "./scoring";
import { findAccountPatterns } from "./accountFindings";

export { checks } from "./checks";
export { partitionOutcomes, rankWorstFirst, gradeFor } from "./scoring";
export { describePattern } from "./accountFindings";
export type { RepoScore, CheckOutcome } from "./scoring";
export type { Findings, Pattern } from "./accountFindings";

/** Grades older than this are refreshed automatically when the page is opened. */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

function toStored(s: RepoScore): StoredRepoScore {
  const r = s.repo;
  return {
    repo: {
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      html_url: r.html_url,
      description: r.description,
      fork: r.fork,
      homepage: r.homepage,
      topics: r.topics,
      stargazers_count: r.stargazers_count,
      pushed_at: r.pushed_at,
    },
    score: s.score,
    grade: s.grade,
    earned: s.earned,
    possible: s.possible,
    outcomes: s.outcomes.map((o) => ({ id: o.check.id, result: o.result })),
  };
}

const byId = new Map(checks.map((c) => [c.id, c]));

/** Rehydrate a stored row into full RepoScore objects (check metadata comes from the registry). */
export function fromStored(rows: StoredRepoScore[]): RepoScore[] {
  return rows.map((s) => ({
    // Fields the checks/UI never read again are stubbed; StoredRepoScore keeps what the page shows.
    repo: { ...s.repo, owner: { login: s.repo.full_name.split("/")[0] }, archived: false, license: null, created_at: "", default_branch: "" },
    score: s.score,
    grade: s.grade as RepoScore["grade"],
    earned: s.earned,
    possible: s.possible,
    outcomes: s.outcomes
      .filter((o) => byId.has(o.id))
      .map<CheckOutcome>((o) => ({ check: byId.get(o.id)!, result: o.result })),
  }));
}

/** Fetch, score, and persist the user's public repos. Returns the fresh row. */
export async function gradeUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.githubLogin) throw new Error(`User ${userId} has no GitHub login`);
  const token = await getGitHubToken(userId);
  if (!token) throw new GitHubError("No GitHub token stored for user", 401);

  const repos = await fetchPublicRepos(token, user.githubLogin);
  const contexts = await loadRepoContexts(token, repos);
  const scores = contexts.map((c) => scoreRepo(c));
  const account = scoreAccount(scores);

  const row = {
    userId,
    accountScore: account.score,
    accountGrade: account.grade,
    repos: scores.map(toStored),
    gradedAt: new Date(),
  };
  await db
    .insert(repoGrades)
    .values(row)
    .onConflictDoUpdate({
      target: repoGrades.userId,
      set: { accountScore: row.accountScore, accountGrade: row.accountGrade, repos: row.repos, gradedAt: row.gradedAt },
    });
  return row;
}

export async function getGrade(userId: string) {
  const [row] = await db.select().from(repoGrades).where(eq(repoGrades.userId, userId)).limit(1);
  if (!row) return null;
  const scores = fromStored(row.repos);
  return {
    accountScore: row.accountScore,
    accountGrade: row.accountGrade,
    gradedAt: row.gradedAt,
    scores,
    findings: findAccountPatterns(scores),
    stale: Date.now() - row.gradedAt.getTime() > STALE_AFTER_MS,
  };
}
