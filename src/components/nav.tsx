import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/logo";

export async function Nav() {
  const session = await auth();
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-13 max-w-5xl items-center justify-between px-5">
        <Link href={session ? "/dashboard" : "/"} className="hover:opacity-80">
          <Logo />
        </Link>

        {session?.user ? (
          <nav className="flex items-center gap-5 text-[13px]">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
            <Link href="/settings" className="text-muted-foreground hover:text-foreground">Settings</Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
              className="flex items-center gap-2 border-l border-border pl-5"
            >
              {session.user.image ? (
                <Image src={session.user.image} alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-full" />
              ) : null}
              <button type="submit" title="Sign out" className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </nav>
        ) : (
          <a
            href="https://github.com/ronakrupani/gitspark"
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-muted-foreground hover:text-foreground"
          >
            Source
          </a>
        )}
      </div>
    </header>
  );
}
