"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-accent disabled:opacity-60"
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await fetch("/api/sync", { method: "POST" });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              setError(body.error ?? `Sync failed (${res.status})`);
              return;
            }
            router.refresh();
          })
        }
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Syncing" : "Sync"}
      </button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
