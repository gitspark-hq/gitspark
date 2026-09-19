"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Kicks off a sync in the background (used right after first sign-in) and refreshes the page. */
export function AutoSync({ detectTimezone }: { detectTimezone: boolean }) {
  const router = useRouter();
  const ran = useRef(false);

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
      await fetch("/api/sync", { method: "POST" }).catch(() => undefined);
      router.replace("/dashboard");
      router.refresh();
    })();
  }, [detectTimezone, router]);

  return (
    <p className="text-sm text-muted-foreground animate-pulse">
      Pulling your last year of GitHub activity…
    </p>
  );
}
