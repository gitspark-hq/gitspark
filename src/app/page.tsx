import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/nav";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-4 py-24 text-center">
        <div className="text-7xl">🔥</div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Duolingo for your GitHub profile
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground">
          Set a daily goal, keep your contribution streak alive, earn XP for commits, PRs and
          reviews — and get a nudge before the day ends.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard?first=1" });
          }}
        >
          <Button size="lg" type="submit" className="text-base">
            Continue with GitHub
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Read-only access to your public profile and contribution counts. We never write to your repos.
        </p>
      </main>
    </>
  );
}
