"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

/**
 * "Grade" / "Re-grade" button. With `auto`, fires once on mount (first visit or
 * stale results) and shows a progress state instead of the button.
 */
export function GradeButton({ auto = false, label = "Re-grade" }: { auto?: boolean; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  const run = () =>
    start(async () => {
      setError(null);
      const res = await fetch("/api/grade", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Grading failed (${res.status})`);
        return;
      }
      router.refresh();
    });

  useEffect(() => {
    if (auto && !ran.current) {
      ran.current = true;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  if (auto && pending) {
    return (
      <div className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Grading your public repos
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-accent disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Grading" : label}
      </button>
      {error ? <p className="max-w-xs text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
