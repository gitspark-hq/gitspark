"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { recomputeStreak, syncUser } from "@/lib/sync";

const Settings = z.object({
  dailyGoal: z.coerce.number().int().min(1).max(50),
  timezone: z.string().min(1).max(64),
  reminderHour: z.coerce.number().int().min(0).max(23),
  remindersEnabled: z.boolean(),
});

export type SettingsState = { ok?: boolean; error?: string };

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const parsed = Settings.safeParse({
    dailyGoal: formData.get("dailyGoal"),
    timezone: formData.get("timezone"),
    reminderHour: formData.get("reminderHour"),
    remindersEnabled: formData.get("remindersEnabled") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    Intl.DateTimeFormat(undefined, { timeZone: parsed.data.timezone });
  } catch {
    return { error: "Unknown timezone" };
  }

  await db.update(users).set(parsed.data).where(eq(users.id, session.user.id));
  // Goal and timezone both change what counts as a streak day. A timezone change also
  // re-buckets recent days, so re-sync; fall back to a recompute if GitHub is unreachable.
  try {
    await syncUser(session.user.id);
  } catch {
    await recomputeStreak(session.user.id, parsed.data.dailyGoal, parsed.data.timezone);
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}
