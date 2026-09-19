import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { profileAnalyses } from "@/db/schema";

const Body = z.object({
  text: z.string().min(1).max(6000),
  fixes: z.array(z.string().min(1).max(400)).max(10),
  dataAt: z.string().datetime(),
  fingerprint: z.string().min(1).max(64),
});

/** The browser wrote the analysis on-device; this just stores it for the account. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const row = {
    userId: session.user.id,
    text: parsed.data.text,
    fixes: parsed.data.fixes,
    dataAt: new Date(parsed.data.dataAt),
    fingerprint: parsed.data.fingerprint,
    writtenAt: new Date(),
  };
  await db
    .insert(profileAnalyses)
    .values(row)
    .onConflictDoUpdate({
      target: profileAnalyses.userId,
      set: { text: row.text, fixes: row.fixes, dataAt: row.dataAt, fingerprint: row.fingerprint, writtenAt: row.writtenAt },
    });
  return NextResponse.json({ ok: true });
}
