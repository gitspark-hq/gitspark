import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsForm
              initial={{
                dailyGoal: user.dailyGoal,
                timezone: user.timezone,
                reminderHour: user.reminderHour,
                remindersEnabled: user.remindersEnabled,
              }}
              timezones={timezones}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
