import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

const Body = z.object({ timezone: z.string().min(1).max(64) });

/** Called once from the browser after first sign-in to store the detected IANA timezone. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    Intl.DateTimeFormat(undefined, { timeZone: parsed.data.timezone });
  } catch {
    return NextResponse.json({ error: "Unknown timezone" }, { status: 400 });
  }

  await db.update(users).set({ timezone: parsed.data.timezone }).where(eq(users.id, session.user.id));
  return NextResponse.json({ ok: true });
}
