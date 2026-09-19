import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Nav } from "@/components/nav";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) redirect("/");

  const timezones = Intl.supportedValuesOf("timeZone");
  if (!timezones.includes(user.timezone)) timezones.unshift(user.timezone);

  return (
    <>
      <Nav />
      <main className="relative flex-1">
        <div className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-[300px]" />
        <div className="relative mx-auto w-full max-w-2xl px-4 py-8">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Tune your goal and when we nudge you.</p>
          <div className="card-glass mt-6 rounded-2xl p-6">
            <SettingsForm
              initial={{
                dailyGoal: user.dailyGoal,
                timezone: user.timezone,
                reminderHour: user.reminderHour,
                remindersEnabled: user.remindersEnabled,
              }}
              timezones={timezones}
            />
          </div>
        </div>
      </main>
    </>
  );
}
