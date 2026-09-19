import { redirect } from "next/navigation";
import { ArrowRight, Bell, Flame, Zap } from "lucide-react";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/nav";
import { GitHubIcon } from "@/components/github-icon";
import { Heatmap } from "@/components/heatmap";
import { addDays, toDateString } from "@/lib/streak";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  // Deterministic demo data for the preview heatmap.
  const today = toDateString(new Date());
  const demo = new Map<string, number>();
  for (let i = 0; i < 365; i++) {
    const d = addDays(today, -i);
    // Cheap hash for a natural-looking pattern: lighter on weekends, occasional bursts.
    let h = (i + 1) * 2654435761;
    h = ((h ^ (h >>> 15)) * 2246822519) >>> 0;
    const v = (h % 1000) / 1000;
    const dow = new Date(d + "T00:00:00Z").getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const active = i < 23 || v > (weekend ? 0.72 : 0.38);
    demo.set(d, active ? 1 + Math.floor(v * v * 8) : 0);
  }

  return (
    <>
      <Nav />
      <main className="relative flex-1 overflow-hidden">
        <div className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-[600px]" />
        <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[600px]" />

        <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-16 pt-20 text-center sm:pt-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
            Free · Open source · Read-only GitHub access
          </div>

          <h1 className="mt-2 max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
            Ship every day.
            <br />
            <span className="text-gradient">Keep the streak alive.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Duolingo-style streaks and XP for your GitHub profile. Set a daily goal, earn points for
            commits, PRs and reviews — and get a nudge before the day slips away.
          </p>

          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/dashboard?first=1" });
            }}
            className="mt-8"
          >
            <Button size="lg" type="submit" className="h-12 gap-2.5 rounded-full px-6 text-base font-semibold ring-glow">
              <GitHubIcon className="h-5 w-5" />
              Continue with GitHub
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">No write access. We never touch your repos.</p>

          {/* Preview card */}
          <div className="card-glass mt-16 w-full max-w-4xl rounded-2xl p-5 text-left sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Flame className="h-7 w-7" strokeWidth={2.25} />
                </div>
                <div>
                  <div className="text-3xl font-bold tabular-nums tracking-tight">
                    23 <span className="text-base font-medium text-muted-foreground">day streak</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Goal met today · 2 / 1 contributions</div>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <Mini label="Longest" value="41" />
                <Mini label="Level" value="7" />
                <Mini label="XP" value="5,320" />
              </div>
            </div>
            <div className="mt-6">
              <Heatmap counts={demo} today={today} goal={1} cell={10} />
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 pb-24 sm:grid-cols-3">
          <Feature
            icon={<Flame className="h-5 w-5" />}
            title="Streaks that match GitHub"
            body="Days follow GitHub's own calendar, so your number always agrees with the graph on your profile."
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="XP for real work"
            body="10 per commit, 30 per PR, 20 per review. Level up as you ship — private repos count too."
          />
          <Feature
            icon={<Bell className="h-5 w-5" />}
            title="A nudge, not nagging"
            body="One email at the hour you pick, only on days your streak is actually at risk."
          />
        </section>
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Built with Next.js · Not affiliated with GitHub or Duolingo
      </footer>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card-glass rounded-2xl p-5">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
