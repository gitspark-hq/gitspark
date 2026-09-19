import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db";
import { dailyContributions, reminderLog, streaks, users } from "@/db/schema";
import { assertCron } from "@/lib/cron";
import { nowIn } from "@/lib/time";
import { streakReminderHtml, streakReminderSubject } from "@/emails/streak-reminder";

export const maxDuration = 300;

/**
 * Runs hourly. For each user whose local clock is at their chosen reminder hour
 * and who hasn't hit today's goal, send one email (de-duped via reminder_log).
 *
 * "Today" is the user's local date, matching the streak logic and the dashboard.
 */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "GitSpark <onboarding@resend.dev>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  const resend = new Resend(apiKey);

  const now = new Date();

  const candidates = await db
    .select({ user: users, streak: streaks })
    .from(users)
    .leftJoin(streaks, eq(streaks.userId, users.id))
    .where(eq(users.remindersEnabled, true));

  const result = { sent: 0, skipped: 0, failed: [] as string[] };

  for (const { user, streak } of candidates) {
    if (!user.email) { result.skipped++; continue; }

    const local = nowIn(user.timezone, now);
    if (local.hour !== user.reminderHour) { result.skipped++; continue; }

    const [already] = await db
      .select()
      .from(reminderLog)
      .where(and(eq(reminderLog.userId, user.id), eq(reminderLog.date, local.date)))
      .limit(1);
    if (already) { result.skipped++; continue; }

    const [today] = await db
      .select({ total: dailyContributions.total })
      .from(dailyContributions)
      .where(and(eq(dailyContributions.userId, user.id), eq(dailyContributions.date, local.date)))
      .limit(1);
    const doneToday = today?.total ?? 0;
    if (doneToday >= user.dailyGoal) { result.skipped++; continue; }

    try {
      await resend.emails.send({
        from,
        to: user.email,
        subject: streakReminderSubject({ streak: streak?.currentStreak ?? 0 }),
        html: streakReminderHtml({
          name: user.name ?? user.githubLogin ?? "there",
          streak: streak?.currentStreak ?? 0,
          hoursLeft: 24 - local.hour,
          goal: user.dailyGoal,
          doneToday,
          appUrl,
        }),
      });
      await db.insert(reminderLog).values({ userId: user.id, date: local.date });
      result.sent++;
    } catch (err) {
      result.failed.push(`${user.id}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json(result);
}
