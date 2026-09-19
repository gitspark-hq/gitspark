"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
    <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Pulling your last year of GitHub activity
    </div>
  );
}
