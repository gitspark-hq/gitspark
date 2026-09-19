import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { assertCron } from "@/lib/cron";
import { syncUser } from "@/lib/sync";

export const maxDuration = 300;

export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const all = await db.select({ id: users.id }).from(users);
  const results = { synced: 0, failed: [] as { id: string; error: string }[] };

  for (const u of all) {
    try {
      await syncUser(u.id);
      results.synced++;
    } catch (err) {
      results.failed.push({ id: u.id, error: (err as Error).message });
    }
  }
  return NextResponse.json(results);
}
