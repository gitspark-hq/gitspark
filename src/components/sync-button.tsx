"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SyncButton({ label = "Sync" }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        className="gap-2 border-border/70 bg-white/[0.03] hover:bg-white/[0.06]"
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
        {pending ? "Syncing" : label}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
