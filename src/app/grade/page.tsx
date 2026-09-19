import { redirect } from "next/navigation";
import { ChevronDown, ExternalLink } from "lucide-react";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { GradeButton } from "@/components/grade-button";
import { checks, describePattern, getGrade, partitionOutcomes, rankWorstFirst, type RepoScore } from "@/lib/grade";

export const dynamic = "force-dynamic";

const GRADE_TONE: Record<string, string> = {
  A: "text-success",
  B: "text-success/80",
  C: "text-warning",
  D: "text-warning/80",
  F: "text-destructive",
};

export default async function GradePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const grade = await getGrade(session.user.id);
  const ranked = grade ? rankWorstFirst(grade.scores) : [];

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Profile grade</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Your public repos scored the way a recruiter skims them.
              {grade ? ` Graded ${relative(grade.gradedAt)}.` : ""}
            </p>
          </div>
          {!grade || grade.stale ? <GradeButton auto label="Grade" /> : <GradeButton />}
        </div>

        {!grade ? (
          <div className="rounded-lg border border-border bg-card px-5 py-10 text-center text-[13px] text-muted-foreground">
            Fetching your repos and running 13 checks on each. Usually takes 10–20 seconds.
          </div>
        ) : (
          <>
            {/* Summary */}
            <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="rounded-lg border border-border bg-card px-5 py-5">
                <div className="text-[12px] text-muted-foreground">Account grade</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className={`font-mono text-6xl font-medium leading-none ${GRADE_TONE[grade.accountGrade]}`}>
                    {grade.accountGrade}
                  </span>
                  <span className="font-mono text-xl tabular-nums text-muted-foreground">{grade.accountScore}/100</span>
                </div>
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Average across {grade.scores.length} public {grade.scores.length === 1 ? "repo" : "repos"}. Archived repos are skipped.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card">
                <header className="border-b border-border px-5 py-3.5">
                  <h2 className="text-[14px] font-medium">What to fix first</h2>
                </header>
                {grade.findings.firstFix ? (
                  <div className="border-b border-border px-5 py-3.5 text-[13px]">
                    <span className="text-muted-foreground">Start with </span>
                    <span className="font-medium">{grade.findings.firstFix.repoName}</span>
                    <span className="text-muted-foreground"> — {grade.findings.firstFix.check.title.toLowerCase()}. </span>
                    <span className="text-muted-foreground">{grade.findings.firstFix.check.howToFix}</span>
                  </div>
                ) : (
                  <div className="px-5 py-3.5 text-[13px] text-muted-foreground">Nothing failing. Every check passes on every repo.</div>
                )}
                {grade.findings.patterns.length > 0 ? (
                  <dl className="divide-y divide-border text-[13px]">
                    {grade.findings.patterns.map((p) => (
                      <div key={p.check.id} className="flex items-center justify-between gap-4 px-5 py-2.5">
                        <dt>
                          <span className="font-medium">{p.check.title}</span>
                          <span className="text-muted-foreground"> · {describePattern(p)}</span>
                        </dt>
                        <dd className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">−{p.pointsLost} pts</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            </section>

            {/* Repo list */}
            <section className="mt-4 rounded-lg border border-border bg-card">
              <header className="flex items-baseline justify-between border-b border-border px-5 py-3.5">
                <h2 className="text-[14px] font-medium">Repos, worst first</h2>
                <span className="text-[12px] text-muted-foreground">Expand a row for the fix</span>
              </header>
              {ranked.length === 0 ? (
                <div className="px-5 py-6 text-[13px] text-muted-foreground">No public repos found.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {ranked.map((s) => (
                    <RepoRow key={s.repo.id} score={s} />
                  ))}
                </ul>
              )}
            </section>

            {/* Rubric */}
            <details className="group mt-4 rounded-lg border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[14px] font-medium">
                The rubric
                <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
              </summary>
              <div className="border-t border-border">
                <table className="w-full text-[13px]">
                  <tbody className="divide-y divide-border">
                    {[...checks]
                      .sort((a, b) => b.weight - a.weight)
                      .map((c) => (
                        <tr key={c.id}>
                          <td className="px-5 py-2.5 align-top font-medium">{c.title}</td>
                          <td className="px-5 py-2.5 align-top text-muted-foreground">{c.why}</td>
                          <td className="px-5 py-2.5 text-right align-top font-mono tabular-nums text-muted-foreground">{c.weight}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <p className="border-t border-border px-5 py-3 text-[12px] text-muted-foreground">
                  A 90+ · B 75–89 · C 60–74 · D 40–59 · F below 40. A check that doesn&apos;t apply to a repo is left out of its
                  denominator rather than counted as a failure. Rubric from{" "}
                  <a href="https://github.com/ronakrupani/gitgrade" className="underline" target="_blank" rel="noreferrer">GitGrade</a>.
                </p>
              </div>
            </details>
          </>
        )}
      </main>
    </>
  );
}

function RepoRow({ score }: { score: RepoScore }) {
  const { failed, passed, notApplicable } = partitionOutcomes(score.outcomes);
  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-3 hover:bg-accent/40">
          <span className={`w-6 shrink-0 font-mono text-lg font-medium ${GRADE_TONE[score.grade]}`}>{score.grade}</span>
          <span className="w-12 shrink-0 font-mono text-[13px] tabular-nums text-muted-foreground">{score.score}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{score.repo.name}</span>
            {failed.length > 0 ? (
              <span className="block truncate text-[12px] text-muted-foreground">
                {failed.map((o) => o.check.title).join(" · ")}
              </span>
            ) : (
              <span className="block text-[12px] text-success">All checks pass</span>
            )}
          </span>
          <span className="hidden shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground sm:block">
            {failed.length === 0 ? "" : `−${score.possible - score.earned}`}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
        </summary>

        <div className="border-t border-border bg-background/40 px-5 py-4 pl-[4.75rem]">
          <div className="mb-3 flex items-center gap-3 text-[12px] text-muted-foreground">
            <a href={score.repo.html_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
              {score.repo.full_name} <ExternalLink className="h-3 w-3" />
            </a>
            {score.repo.description ? <span className="truncate">· {score.repo.description}</span> : null}
          </div>

          {failed.length > 0 ? (
            <ol className="space-y-3">
              {failed.map((o) => (
                <li key={o.check.id} className="text-[13px]">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium">{o.check.title}</span>
                    <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">−{o.check.weight}</span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{o.check.howToFix}</p>
                </li>
              ))}
            </ol>
          ) : null}

          <p className="mt-4 text-[12px] text-muted-foreground">
            Passing: {passed.map((o) => o.check.title).join(", ") || "none"}
            {notApplicable.length > 0 ? ` · Not applicable: ${notApplicable.map((o) => o.check.title).join(", ")}` : ""}
          </p>
        </div>
      </details>
    </li>
  );
}

function relative(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
