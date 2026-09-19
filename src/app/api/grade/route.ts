import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { gradeUser } from "@/lib/grade";
import { GitHubError } from "@/lib/github";

export const maxDuration = 120;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const row = await gradeUser(session.user.id);
    return NextResponse.json({ score: row.accountScore, grade: row.accountGrade, repos: row.repos.length });
  } catch (err) {
    const status = err instanceof GitHubError ? (err.status ?? 502) : 500;
    const message =
      status === 401
        ? "GitHub no longer accepts this app's access to your account. Sign out and sign back in to reconnect."
        : (err as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
