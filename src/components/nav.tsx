import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function Nav() {
  const session = await auth();
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2 font-semibold">
          <span className="text-xl">🔥</span> GitStreak
        </Link>
        {session?.user ? (
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <Link href="/settings" className="hover:underline">Settings</Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
