import { redirect } from "next/navigation";
import { and, eq, gte } from "drizzle-orm";
import { Lock } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db";
import { dailyContributions, streaks, users, type RepoActivity } from "@/db/schema";
import { addDays, computeStreak, XP_PER } from "@/lib/streak";
import { nowIn, tzAbbrev } from "@/lib/time";
import { Nav } from "@/components/nav";
import { Heatmap } from "@/components/heatmap";
import { SyncButton } from "@/components/sync-button";
import { AutoSync } from "@/components/auto-sync";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;
  const { first } = await searchParams;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [streakRow] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);

  const timezone = user?.timezone ?? "UTC";
  const local = nowIn(timezone);
  const today = local.date;
  const since = addDays(today, -364);
  const days = await db
    .select()
    .from(dailyContributions)
    .where(and(eq(dailyContributions.userId, userId), gte(dailyContributions.date, since)));

  const goal = user?.dailyGoal ?? 1;
  const s = computeStreak(days, goal, today);
  const counts = new Map(days.map((d) => [d.date, d.total]));
  const todayRow = days.find((d) => d.date === today);
  const doneToday = todayRow?.total ?? 0;
  const goalMet = doneToday >= goal;
  const neverSynced = !streakRow?.lastSyncedAt;
  const hoursLeft = 24 - local.hour;

  const totals = days.reduce(
    (acc, d) => ({
      commits: acc.commits + d.commits,
      prs: acc.prs + d.prs,
      reviews: acc.reviews + d.reviews,
      issues: acc.issues + d.issues,
    }),
    { commits: 0, prs: 0, reviews: 0, issues: 0 },
  );

  const todayXp = todayRow
    ? todayRow.commits * XP_PER.commit + todayRow.prs * XP_PER.pr + todayRow.reviews * XP_PER.review + todayRow.issues * XP_PER.issue
    : 0;

  const statusText = goalMet
    ? "Goal met"
    : s.atRisk
      ? `Streak at risk · ${hoursLeft}h left`
      : "No contributions yet";
  const statusTone = goalMet ? "text-success" : s.atRisk ? "text-warning" : "text-muted-foreground";

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{user?.githubLogin ?? user?.name}</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {streakRow?.lastSyncedAt ? `Synced ${relative(streakRow.lastSyncedAt)}` : "Not synced"}
              <span className="mx-1.5">·</span>
              {formatDate(today)} · {tzAbbrev(timezone)}
            </p>
          </div>
          {first === "1" || neverSynced ? <AutoSync detectTimezone={first === "1"} /> : <SyncButton />}
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-card sm:grid-cols-4">
          <Cell label="Current streak" value={s.currentStreak} unit="days" />
          <Cell label="Longest streak" value={s.longestStreak} unit="days" />
          <Cell label="Level" value={s.level} sub={`${(s.nextLevelXp - s.xp).toLocaleString()} XP to next`} />
          <Cell label="Total XP" value={s.xp} sub="last 365 days" />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Today */}
          <section className="rounded-lg border border-border bg-card">
            <header className="flex items-baseline justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-[14px] font-medium">Today</h2>
              <span className={`text-[13px] font-medium ${statusTone}`}>{statusText}</span>
            </header>

            <div className="px-5 py-4">
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-3xl font-medium tabular-nums tracking-tight">
                  {doneToday}
                  <span className="text-base text-muted-foreground"> / {goal}</span>
                </div>
                <div className="text-[13px] text-muted-foreground">
                  {todayXp > 0 ? `+${todayXp} XP` : "0 XP"}
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-sm bg-white/[0.07]">
                <div
                  className={`h-full ${goalMet ? "bg-success" : s.atRisk ? "bg-warning" : "bg-foreground/60"}`}
                  style={{ width: `${Math.min(100, (doneToday / goal) * 100)}%` }}
                />
              </div>

              <dl className="mt-5 grid grid-cols-4 gap-3">
                <Kind label="Commits" value={todayRow?.commits ?? 0} xp={XP_PER.commit} />
                <Kind label="Pull requests" value={todayRow?.prs ?? 0} xp={XP_PER.pr} />
                <Kind label="Reviews" value={todayRow?.reviews ?? 0} xp={XP_PER.review} />
                <Kind label="Issues" value={todayRow?.issues ?? 0} xp={XP_PER.issue} />
              </dl>
            </div>

            <RepoList repos={todayRow?.repos ?? []} exact={todayRow?.exact ?? false} empty={doneToday === 0} />
          </section>

          {/* Right column: level + year totals */}
          <div className="space-y-4">
            <section className="rounded-lg border border-border bg-card">
              <header className="flex items-baseline justify-between border-b border-border px-5 py-3.5">
                <h2 className="text-[14px] font-medium">Level {s.level}</h2>
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                  {s.xp.toLocaleString()} / {s.nextLevelXp.toLocaleString()}
                </span>
              </header>
              <div className="px-5 py-4">
                <div className="h-1.5 w-full overflow-hidden rounded-sm bg-white/[0.07]">
                  <div className="h-full bg-foreground/60" style={{ width: `${Math.round(s.levelProgress * 100)}%` }} />
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                  {XP_PER.commit} XP per commit · {XP_PER.pr} per PR · {XP_PER.review} per review · {XP_PER.issue} per issue
                </p>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card">
              <header className="border-b border-border px-5 py-3.5">
                <h2 className="text-[14px] font-medium">Last 365 days</h2>
              </header>
              <dl className="divide-y divide-border text-[13px]">
                <Row label="Commits" value={totals.commits} />
                <Row label="Pull requests" value={totals.prs} />
                <Row label="Reviews" value={totals.reviews} />
                <Row label="Issues" value={totals.issues} />
              </dl>
            </section>
          </div>
        </div>

        {/* Heatmap */}
        <section className="mt-4 rounded-lg border border-border bg-card">
          <header className="flex items-baseline justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-[14px] font-medium">Contributions</h2>
            <span className="text-[12px] text-muted-foreground">Days in {timezone.replace("_", " ")}</span>
          </header>
          <div className="px-5 py-4">
            <Heatmap counts={counts} today={today} goal={goal} />
          </div>
        </section>
      </main>
    </>
  );
}

function Cell({ label, value, unit, sub }: { label: string; value: number; unit?: string; sub?: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-medium tabular-nums tracking-tight">
        {value.toLocaleString()}
        {unit ? <span className="ml-1 text-sm text-muted-foreground">{unit}</span> : null}
      </div>
      {sub ? <div className="mt-0.5 text-[12px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function Kind({ label, value, xp }: { label: string; value: number; xp: number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2.5">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex items-baseline justify-between">
        <span className="font-mono text-lg font-medium tabular-nums">{value}</span>
        <span className="text-[11px] text-muted-foreground">{xp} XP</span>
      </dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{value.toLocaleString()}</dd>
    </div>
  );
}

function RepoList({ repos, exact, empty }: { repos: RepoActivity[]; exact: boolean; empty: boolean }) {
  if (empty) {
    return (
      <div className="border-t border-border px-5 py-4 text-[13px] text-muted-foreground">
        Nothing yet today. A commit, PR, review or issue on any repo counts.
      </div>
    );
  }
  if (!exact || repos.length === 0) {
    return (
      <div className="border-t border-border px-5 py-4 text-[13px] text-muted-foreground">
        Repository breakdown will appear after the next sync.
      </div>
    );
  }
  return (
    <div className="border-t border-border">
      <div className="px-5 pb-1 pt-3 text-[12px] text-muted-foreground">By repository</div>
      <ul className="divide-y divide-border">
        {repos.map((r) => (
          <li key={r.repo} className="flex items-center justify-between gap-4 px-5 py-2.5 text-[13px]">
            <a
              href={`https://github.com/${r.repo}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-1.5 truncate hover:underline"
            >
              <span className="truncate">{r.repo}</span>
              {r.isPrivate ? <Lock className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
            </a>
            <div className="flex shrink-0 gap-3 font-mono text-[12px] tabular-nums text-muted-foreground">
              {r.commits > 0 ? <span>{r.commits} commit{r.commits === 1 ? "" : "s"}</span> : null}
              {r.prs > 0 ? <span>{r.prs} PR{r.prs === 1 ? "" : "s"}</span> : null}
              {r.reviews > 0 ? <span>{r.reviews} review{r.reviews === 1 ? "" : "s"}</span> : null}
              {r.issues > 0 ? <span>{r.issues} issue{r.issues === 1 ? "" : "s"}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
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

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}
