import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncUser } from "@/lib/sync";
import { GitHubError } from "@/lib/github";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncUser(session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof GitHubError ? (err.status ?? 502) : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
