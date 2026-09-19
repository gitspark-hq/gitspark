import { redirect } from "next/navigation";
import { and, eq, gte } from "drizzle-orm";
import { Clock, GitCommitHorizontal, GitPullRequest, MessageSquare, CircleDot, Star, Trophy, Zap, Flame } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db";
import { dailyContributions, streaks, users } from "@/db/schema";
import { addDays, computeStreak, toDateString } from "@/lib/streak";
import { Nav } from "@/components/nav";
import { Heatmap } from "@/components/heatmap";
import { StreakRing } from "@/components/streak-ring";
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

  const today = toDateString(new Date());
  const since = addDays(today, -364);
  const days = await db
    .select()
    .from(dailyContributions)
    .where(and(eq(dailyContributions.userId, userId), gte(dailyContributions.date, since)));

  const goal = user?.dailyGoal ?? 1;
  const s = computeStreak(days, goal, today);
  const counts = new Map(days.map((d) => [d.date, d.total]));
  const doneToday = counts.get(today) ?? 0;
  const goalMet = doneToday >= goal;
  const neverSynced = !streakRow?.lastSyncedAt;

  const totals = days.reduce(
    (acc, d) => ({
      commits: acc.commits + d.commits,
      prs: acc.prs + d.prs,
      reviews: acc.reviews + d.reviews,
      issues: acc.issues + d.issues,
    }),
    { commits: 0, prs: 0, reviews: 0, issues: 0 },
  );

  const hoursLeft = 24 - new Date().getUTCHours();
  const firstName = user?.name?.split(" ")[0] ?? user?.githubLogin ?? "there";

  const status = goalMet
    ? { title: "Goal met. Streak is safe.", body: "Nice work — come back tomorrow to keep it going.", tone: "text-primary" }
    : s.atRisk
      ? { title: `Streak at risk`, body: `${goal - doneToday} more contribution${goal - doneToday === 1 ? "" : "s"} in the next ${hoursLeft}h to keep your ${s.currentStreak}-day streak.`, tone: "text-warning" }
      : { title: "Start a streak today", body: `Make ${goal} contribution${goal === 1 ? "" : "s"} — a commit, PR, review, or issue.`, tone: "text-foreground" };

  return (
    <>
      <Nav />
      <main className="relative flex-1">
        <div className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
        <div className="relative mx-auto w-full max-w-5xl space-y-5 px-4 py-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Hey {firstName}</h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {streakRow?.lastSyncedAt
                  ? `Synced ${relative(streakRow.lastSyncedAt)}`
                  : "Not synced yet"}
              </p>
            </div>
            {first === "1" || neverSynced ? <AutoSync detectTimezone={first === "1"} /> : <SyncButton />}
          </div>

          {/* Hero: ring + today's goal */}
          <section className="card-glass grid gap-6 rounded-2xl p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
            <StreakRing streak={s.currentStreak} progress={doneToday / goal} atRisk={s.atRisk} goalMet={goalMet} />
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today</div>
              <h2 className={`mt-1 text-2xl font-semibold tracking-tight ${status.tone}`}>{status.title}</h2>
              <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{status.body}</p>

              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Daily goal</span>
                  <span className="font-semibold tabular-nums">
                    {Math.min(doneToday, goal)} <span className="text-muted-foreground">/ {goal}</span>
                  </span>
                </div>
                <Bar value={doneToday / goal} tone={goalMet ? "primary" : s.atRisk ? "warning" : "primary"} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Pill icon={<GitCommitHorizontal className="h-3.5 w-3.5" />} label={`${totals.commits} commits`} />
                <Pill icon={<GitPullRequest className="h-3.5 w-3.5" />} label={`${totals.prs} PRs`} />
                <Pill icon={<MessageSquare className="h-3.5 w-3.5" />} label={`${totals.reviews} reviews`} />
                <Pill icon={<CircleDot className="h-3.5 w-3.5" />} label={`${totals.issues} issues`} />
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon={<Flame className="h-5 w-5" />} label="Current streak" value={s.currentStreak} suffix="days" />
            <Stat icon={<Trophy className="h-5 w-5" />} label="Longest streak" value={s.longestStreak} suffix="days" />
            <Stat icon={<Star className="h-5 w-5" />} label="Level" value={s.level} />
            <Stat icon={<Zap className="h-5 w-5" />} label="Total XP" value={s.xp} />
          </section>

          {/* Level */}
          <section className="card-glass rounded-2xl p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">Level {s.level}</h3>
              <span className="text-sm tabular-nums text-muted-foreground">
                {s.xp.toLocaleString()} / {s.nextLevelXp.toLocaleString()} XP
              </span>
            </div>
            <div className="mt-3">
              <Bar value={s.levelProgress} tone="primary" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {(s.nextLevelXp - s.xp).toLocaleString()} XP to level {s.level + 1} · 10 per commit, 30 per PR, 20 per review, 5 per issue
            </p>
          </section>

          {/* Heatmap */}
          <section className="card-glass rounded-2xl p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="font-semibold">Last 52 weeks</h3>
              <span className="text-xs text-muted-foreground">Follows GitHub&apos;s calendar (UTC)</span>
            </div>
            <Heatmap counts={counts} today={today} goal={goal} />
          </section>
        </div>
      </main>
    </>
  );
}

function Bar({ value, tone }: { value: number; tone: "primary" | "warning" }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const color = tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={`h-full rounded-full ${color} transition-[width] duration-700 ease-out`}
        style={{ width: `${pct}%`, boxShadow: pct > 0 ? `0 0 12px -2px var(--${tone})` : undefined }}
      />
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/[0.03] px-2.5 py-1 text-xs text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

function Stat({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: number; suffix?: string }) {
  return (
    <div className="card-glass rounded-2xl p-5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">{icon}</div>
      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">
        {value.toLocaleString()}
        {suffix ? <span className="ml-1.5 text-sm font-medium text-muted-foreground">{suffix}</span> : null}
      </div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
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
