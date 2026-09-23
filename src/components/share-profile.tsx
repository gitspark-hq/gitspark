"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

/** Copy-link control for the public profile page. */
export function ShareProfile({ login, enabled }: { login: string; enabled: boolean }) {
  const [copied, setCopied] = useState(false);
  const path = `/u/${login}`;
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[12px] text-muted-foreground">
        {url.replace(/^https?:\/\//, "")}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {}
        }}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-foreground px-3 text-[13px] font-medium text-background hover:opacity-90"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] hover:bg-accent"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {enabled ? "View" : "Preview"}
      </a>
    </div>
  );
}
