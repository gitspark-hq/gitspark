import { signIn } from "@/auth";
import { Nav } from "@/components/nav";
import { GitHubIcon } from "@/components/github-icon";

/**
 * Replaces Auth.js's default "Server error / problem with the server
 * configuration" page, which it shows for almost everything, including the
 * common case of the sign-in state cookie going missing (login finished in a
 * different browser context, or took longer than 15 minutes).
 */
export default async function AuthErrorPage({ searchParams }: PageProps<"/auth/error">) {
  const { error } = await searchParams;
  const code = typeof error === "string" ? error : "Default";

  const copy =
    code === "AccessDenied"
      ? {
          title: "GitHub access was declined",
          body: "You cancelled on GitHub's authorize screen, so nothing was connected. Try again whenever you like.",
        }
      : code === "Verification" || code === "Configuration" || code === "Default"
        ? {
            title: "Sign-in didn't finish",
            body: "GitHub sent you back, but the browser session that started the sign-in wasn't there to receive it. This usually happens when login finished in a different browser or tab (common when signing in to GitHub through Google on a phone), or took more than 15 minutes. Nothing is wrong with your account. Try once more from here, in this same browser.",
          }
        : {
            title: "Sign-in didn't finish",
            body: "Something interrupted the GitHub sign-in. Try again from here.",
          };

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
        <h1 className="text-xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{copy.body}</p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard?first=1" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2.5 rounded-md bg-foreground px-4 text-[14px] font-medium text-background hover:opacity-90"
          >
            <GitHubIcon className="h-4 w-4" />
            Try again with GitHub
          </button>
        </form>
        <p className="mt-6 text-[12px] text-muted-foreground">
          Still stuck? Open GitSpark directly in Safari or Chrome rather than inside another app, sign in to GitHub there first, then come back and press the button.
        </p>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground/60">code: {code}</p>
      </main>
    </>
  );
}
