import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

// Our tables call .enableRLS(), which the adapter's types don't account for
// (they strip that method from the type); the runtime shape is identical, so cast.
// DrizzleAdapter is overloaded per dialect; pick the Postgres schema type by matching on our db.
type AdapterSchema = typeof DrizzleAdapter extends (client: typeof db, schema?: infer S) => unknown
  ? NonNullable<S>
  : never;
const authTables = {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
} as unknown as AdapterSchema;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, authTables),
  providers: [
    GitHub({
      // read:user is enough for the contributions calendar (incl. the user's own
      // private contribution counts). Add "repo" later if you want private-repo detail.
      authorization: { params: { scope: "read:user user:email" } },
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubLogin: profile.login,
        };
      },
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    async signIn({ user, profile, account }) {
      // The adapter's createUser only persists standard fields; backfill the GitHub login.
      const login = (profile as { login?: string } | undefined)?.login;
      if (user.id && login) {
        await db.update(users).set({ githubLogin: login }).where(eq(users.id, user.id));
      }
      // The adapter writes the account row once, on first sign-in. If GitHub later revokes
      // the token (secret rotated, user revoked access), a fresh sign-in must replace it.
      if (account?.access_token) {
        await db
          .update(accounts)
          .set({ access_token: account.access_token, scope: account.scope ?? null, token_type: account.token_type ?? null })
          .where(and(eq(accounts.provider, account.provider), eq(accounts.providerAccountId, account.providerAccountId)));
      }
    },
  },
  pages: { signIn: "/" },
});
