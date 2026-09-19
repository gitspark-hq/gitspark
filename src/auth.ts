import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
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
    // The adapter's createUser only persists standard fields; backfill the GitHub login.
    async signIn({ user, profile }) {
      const login = (profile as { login?: string } | undefined)?.login;
      if (user.id && login) {
        await db.update(users).set({ githubLogin: login }).where(eq(users.id, user.id));
      }
    },
  },
  pages: { signIn: "/" },
});
