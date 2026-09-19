import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { ProfileAnalysis } from "@/components/profile-analysis";
import { buildProfileSummary } from "@/lib/profile-summary";
import { db } from "@/db";
import { profileAnalyses } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const summary = await buildProfileSummary(session.user.id);
  if (!summary) redirect("/dashboard");

  const [row] = await db.select().from(profileAnalyses).where(eq(profileAnalyses.userId, session.user.id)).limit(1);
  const saved = row
    ? { text: row.text, fixes: row.fixes, at: row.writtenAt.toISOString(), dataAt: row.dataAt.toISOString(), fingerprint: row.fingerprint }
    : null;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Profile analysis</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            A short written read on your activity and repo quality, generated on your device.
            {summary.grade ? null : (
              <>
                {" "}
                <Link href="/grade" className="underline hover:text-foreground">Grade your repos</Link> first for a fuller picture.
              </>
            )}
          </p>
        </div>
        <ProfileAnalysis summary={summary} initialSaved={saved} />
      </main>
    </>
  );
}
