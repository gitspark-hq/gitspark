import { redirect } from "next/navigation";
import { and, eq, gte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { dailyContributions, streaks, users } from "@/db/schema";
import { addDays, computeStreak, toDateString } from "@/lib/streak";
import { Nav } from "@/components/nav";
import { Heatmap } from "@/components/heatmap";
import { SyncButton } from "@/components/sync-button";
import { AutoSync } from "@/components/auto-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Hey {user?.name?.split(" ")[0] ?? user?.githubLogin ?? "there"} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {streakRow?.lastSyncedAt
                ? `Last synced ${streakRow.lastSyncedAt.toLocaleString()}`
                : "Not synced yet"}
            </p>
          </div>
          {first === "1" || neverSynced ? (
            <AutoSync detectTimezone={first === "1"} />
          ) : (
            <SyncButton />
          )}
        </div>

        {/* Today's goal */}
        <Card className={goalMet ? "border-primary" : s.atRisk ? "border-orange-400" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today&apos;s goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">
                {Math.min(doneToday, goal)}
                <span className="text-lg font-normal text-muted-foreground"> / {goal}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {goalMet
                  ? "Done! Streak is safe for today 🎉"
                  : s.atRisk
                    ? `Your ${s.currentStreak}-day streak ends at midnight UTC — push something!`
                    : `Make ${goal - doneToday} contribution${goal - doneToday === 1 ? "" : "s"} to start a streak`}
              </p>
            </div>
            <Progress value={Math.min(100, (doneToday / goal) * 100)} />
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Current streak" value={`${s.currentStreak}`} suffix="days" icon="🔥" />
          <Stat label="Longest streak" value={`${s.longestStreak}`} suffix="days" icon="🏆" />
          <Stat label="Level" value={`${s.level}`} icon="⭐" />
          <Stat label="Total XP" value={s.xp.toLocaleString()} icon="✨" />
        </div>

        {/* Level progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-baseline justify-between text-base">
              <span>Level {s.level}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {s.xp.toLocaleString()} / {s.nextLevelXp.toLocaleString()} XP to level {s.level + 1}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={Math.round(s.levelProgress * 100)} />
            <p className="mt-3 text-xs text-muted-foreground">
              Last 365 days: {totals.commits} commits · {totals.prs} PRs · {totals.reviews} reviews ·{" "}
              {totals.issues} issues. XP: 10 per commit, 30 per PR, 20 per review, 5 per issue.
            </p>
          </CardContent>
        </Card>

        {/* Heatmap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Last 52 weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <Heatmap counts={counts} today={today} goal={goal} />
            <p className="mt-3 text-xs text-muted-foreground">
              Days follow GitHub&apos;s calendar (UTC), so this matches the graph on your profile.
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Stat({ label, value, suffix, icon }: { label: string; value: string; suffix?: string; icon: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl">{icon}</div>
        <div className="mt-2 text-2xl font-bold">
          {value}
          {suffix ? <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span> : null}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
