"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Kicks off a sync in the background (used right after first sign-in) and refreshes the page. */
export function AutoSync({ detectTimezone }: { detectTimezone: boolean }) {
  const router = useRouter();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      if (detectTimezone) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await fetch("/api/settings/timezone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: tz }),
        }).catch(() => undefined);
      }
      const res = await fetch("/api/sync", { method: "POST" }).catch(() => null);
      if (res && !res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Sync failed (${res.status})`);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    })();
  }, [detectTimezone, router]);

  if (error) {
    return <p className="max-w-xs text-right text-[13px] text-destructive">{error}</p>;
  }

  return (
    <div className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Importing GitHub activity
    </div>
  );
}
