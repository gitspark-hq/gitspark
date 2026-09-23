import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { Heatmap } from "@/components/heatmap";
import { GitHubIcon } from "@/components/github-icon";
import { getPublicProfile } from "@/lib/public-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/u/[login]">): Promise<Metadata> {
  const { login } = await params;
  const p = await getPublicProfile(login);
  if (!p) return { title: "Profile not found" };

  const title = `${p.login} on GitSpark`;
  const description = `${p.streak.currentStreak} day streak, level ${p.streak.level}, active ${p.activeDays365} of the last 365 days${
    p.grade ? `, repos graded ${p.grade.letter}` : ""
  }.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicProfilePage({ params }: PageProps<"/u/[login]">) {
  const { login } = await params;
  const session = await auth();
  const p = await getPublicProfile(login, session?.user?.id);
  if (!p) notFound();

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        {p.isOwner ? (
          <p className="mb-5 rounded-md border border-border bg-card px-4 py-2.5 text-[13px] text-muted-foreground">
            {p.isPublic
              ? "This is your public page. Anyone with the link can see it."
              : "Only you can see this. Turn on sharing to give it a link that works for everyone."}{" "}
            <Link href="/settings" className="underline hover:text-foreground">
              Sharing settings
            </Link>
          </p>
        ) : null}

        {/* Identity */}
        <header className="flex items-center gap-4">
          {p.avatar ? (
            <Image src={p.avatar} alt="" width={56} height={56} className="h-14 w-14 rounded-full ring-1 ring-border" />
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{p.name ?? p.login}</h1>
            <a
              href={`https://github.com/${p.login}`}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
            >
              <GitHubIcon className="h-3.5 w-3.5" />
              {p.login}
            </a>
          </div>
        </header>

        {/* Numbers */}
        <section className="mt-6 grid grid-cols-2 divide-border rounded-lg border border-border bg-card sm:grid-cols-4 sm:divide-x">
          <Cell label="Current streak" value={p.streak.currentStreak} unit="days" />
          <Cell label="Longest" value={p.streak.longestStreak} unit="days" />
          <Cell label="Level" value={p.streak.level} sub={`${p.streak.xp.toLocaleString()} XP`} />
          <Cell label="Active days" value={p.activeDays365} sub="of the last 365" />
        </section>

        {/* Heatmap */}
        <section className="mt-4 rounded-lg border border-border bg-card">
          <header className="flex items-baseline justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-[14px] font-medium">Contributions</h2>
            <span className="text-[12px] text-muted-foreground">
              {p.totals.commits} commits · {p.totals.prs} PRs · {p.totals.reviews} reviews
            </span>
          </header>
          <div className="px-5 py-4">
            <Heatmap counts={p.counts} today={p.today} goal={p.dailyGoal} />
          </div>
        </section>

        {/* Grade */}
        {p.grade ? (
          <section className="mt-4 flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4">
            <div>
              <h2 className="text-[14px] font-medium">Repo quality</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {p.grade.repoCount} public {p.grade.repoCount === 1 ? "repo" : "repos"} scored on README, license, description and more
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-medium leading-none">{p.grade.letter}</span>
              <span className="font-mono text-[13px] tabular-nums text-muted-foreground">{p.grade.score}/100</span>
            </div>
          </section>
        ) : null}

        <footer className="mt-8 flex items-center justify-between border-t border-border pt-5 text-[12px] text-muted-foreground">
          <span>Tracked with GitSpark</span>
          <Link href="/" className="underline hover:text-foreground">
            Start your own streak
          </Link>
        </footer>
      </main>
    </>
  );
}

function Cell({ label, value, unit, sub }: { label: string; value: number; unit?: string; sub?: string }) {
  return (
    <div className="border-b border-border px-5 py-4 last:border-b-0 sm:border-b-0">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-medium tabular-nums tracking-tight">
        {value.toLocaleString()}
        {unit ? <span className="ml-1 text-sm text-muted-foreground">{unit}</span> : null}
      </div>
      {sub ? <div className="mt-0.5 text-[12px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
