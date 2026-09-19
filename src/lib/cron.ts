import { NextResponse } from "next/server";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; we require the same for manual calls. */
export function assertCron(req: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
