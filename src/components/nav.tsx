import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/logo";

export async function Nav() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href={session ? "/dashboard" : "/"} className="transition hover:opacity-80">
          <Logo />
        </Link>

        {session?.user ? (
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavLink>
            <NavLink href="/settings" icon={<Settings className="h-4 w-4" />}>Settings</NavLink>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
              className="ml-2 flex items-center gap-2 border-l border-border/60 pl-3"
            >
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full ring-1 ring-border"
                />
              ) : null}
              <button
                type="submit"
                title="Sign out"
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </nav>
        ) : (
          <a
            href="https://github.com/ronakrupani/gitstreak"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            GitHub ↗
          </a>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}
