"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SyncButton({ label = "Sync now" }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
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
        {pending ? "Syncing…" : label}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
