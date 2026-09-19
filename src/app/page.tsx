import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
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
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-5 pb-12 pt-20 sm:pt-28">
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            A daily contribution goal for your GitHub profile.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            GitStreak tracks your commits, pull requests, reviews and issues against a goal you set,
            keeps your streak, and sends one reminder on days you&apos;re about to miss it.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/dashboard?first=1" });
            }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2.5 rounded-md bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-90"
            >
              <GitHubIcon className="h-4 w-4" />
              Continue with GitHub
            </button>
            <span className="text-[13px] text-muted-foreground">Read-only. No access to your code.</span>
          </form>
        </section>

        <section className="mx-auto w-full max-w-5xl px-5 pb-20">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border px-6 py-5">
              <div>
                <div className="text-[12px] text-muted-foreground">Current streak</div>
                <div className="mt-1 font-mono text-4xl font-medium tabular-nums tracking-tight">23<span className="ml-1.5 text-base text-muted-foreground">days</span></div>
              </div>
              <dl className="grid grid-cols-3 gap-8 text-[13px]">
                <Mini label="Longest" value="41" />
                <Mini label="Level" value="7" />
                <Mini label="XP" value="5,320" />
              </dl>
            </div>
            <div className="px-6 py-5">
              <Heatmap counts={demo} today={today} goal={1} cell={10} />
            </div>
          </div>

          <dl className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-3">
            <Feature
              title="Matches GitHub exactly"
              body="Days follow GitHub's own calendar, so the streak here always agrees with the graph on your profile. Private contributions count."
            />
            <Feature
              title="Points for the work that matters"
              body="10 XP per commit, 30 per pull request, 20 per review, 5 per issue. Levels scale quadratically so they stay meaningful."
            />
            <Feature
              title="One reminder, not a feed"
              body="A single email at the hour you choose — and only on days your goal isn't met yet. Nothing else."
            />
          </dl>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 text-[12px] text-muted-foreground">
          <span>GitStreak</span>
          <span>Not affiliated with GitHub or Duolingo</span>
        </div>
      </footer>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-lg font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <dt className="text-[14px] font-medium">{title}</dt>
      <dd className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{body}</dd>
    </div>
  );
}
