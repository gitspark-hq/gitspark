import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---- Auth.js tables (shape required by @auth/drizzle-adapter) ----

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // GitSpark-specific columns
  githubLogin: text("github_login"),
  timezone: text("timezone").notNull().default("UTC"),
  dailyGoal: integer("daily_goal").notNull().default(1),
  reminderHour: integer("reminder_hour").notNull().default(20),
  remindersEnabled: boolean("reminders_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}).enableRLS();

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
).enableRLS();

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}).enableRLS();

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
).enableRLS();

// ---- GitSpark tables ----

/** One row per user per (UTC, GitHub-calendar) day. Cached snapshot of GitHub data. */
export const dailyContributions = pgTable(
  "daily_contributions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(), // YYYY-MM-DD
    commits: integer("commits").notNull().default(0),
    prs: integer("prs").notNull().default(0),
    reviews: integer("reviews").notNull().default(0),
    issues: integer("issues").notNull().default(0),
    total: integer("total").notNull().default(0),
    /** Per-repo breakdown; only populated for days synced individually (recent days). */
    repos: jsonb("repos").$type<RepoActivity[]>(),
    /** True when commits/prs/reviews/issues are exact (1-day fetch) vs. estimated from a wider window. */
    exact: boolean("exact").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.date] }),
    uniqueIndex("daily_contributions_user_date_idx").on(t.userId, t.date),
  ],
).enableRLS();

export const streaks = pgTable("streaks", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: date("last_active_date", { mode: "string" }),
  xp: integer("xp").notNull().default(0),
  lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
}).enableRLS();

/** Prevents sending more than one reminder per user per day. */
export const reminderLog = pgTable(
  "reminder_log",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    sentAt: timestamp("sent_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
).enableRLS();

export type RepoActivity = {
  repo: string; // owner/name
  isPrivate: boolean;
  commits: number;
  prs: number;
  reviews: number;
  issues: number;
};

export type User = typeof users.$inferSelect;
export type DailyContribution = typeof dailyContributions.$inferSelect;
export type Streak = typeof streaks.$inferSelect;
