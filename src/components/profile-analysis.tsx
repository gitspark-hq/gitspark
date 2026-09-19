"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import type { ProfileSummary } from "@/lib/profile-summary";
import { buildUserPrompt, cleanOutput, SYSTEM_PROMPT } from "@/lib/analysis-prompt";

type Status =
  | { kind: "checking" }
  | { kind: "unsupported" }
  | { kind: "unavailable" }
  | { kind: "downloadable" }
  | { kind: "downloading"; pct: number }
  | { kind: "ready" }
  | { kind: "generating" }
  | { kind: "error"; message: string };

type Saved = { text: string; at: string; dataAt: string };

function storageKey(login: string) {
  return `gitspark:analysis:${login}`;
}

function api(): LanguageModelStatic | undefined {
  if (typeof window === "undefined") return undefined;
  return window.LanguageModel;
}

async function checkAvailability(): Promise<Status> {
  const lm = api();
  if (!lm) return { kind: "unsupported" };
  try {
    const a = await lm.availability({ expectedOutputs: [{ type: "text", languages: ["en"] }] });
    if (a === "available") return { kind: "ready" };
    if (a === "downloadable") return { kind: "downloadable" };
    if (a === "downloading") return { kind: "downloading", pct: 0 };
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

export function ProfileAnalysis({ summary }: { summary: ProfileSummary }) {
  const [status, setStatus] = useState<Status>({ kind: "checking" });
  // Restore the last result for this viewer. Lazy initialiser so it never runs on the server.
  const [saved, setSaved] = useState<Saved | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(storageKey(summary.login));
      return raw ? (JSON.parse(raw) as Saved) : null;
    } catch {
      return null;
    }
  });
  const [text, setText] = useState(() => saved?.text ?? "");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkAvailability().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = useCallback(async () => {
    const lm = api();
    if (!lm) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setStatus({ kind: "generating" });
    setText("");
    let session: LanguageModelSession | null = null;
    try {
      session = await lm.create({
        initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        temperature: 0.6,
        topK: 3,
        signal: ac.signal,
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            const pct = e.total ? Math.round((e.loaded / e.total) * 100) : Math.round(e.loaded * 100);
            setStatus({ kind: "downloading", pct });
          });
        },
      });

      let acc = "";
      const stream = session.promptStreaming(buildUserPrompt(summary), { signal: ac.signal });
      const reader = stream.getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += value;
        setText(cleanOutput(acc));
      }
      const final = cleanOutput(acc);
      setText(final);
      const s: Saved = { text: final, at: new Date().toISOString(), dataAt: summary.generatedAt };
      setSaved(s);
      try {
        localStorage.setItem(storageKey(summary.login), JSON.stringify(s));
      } catch {}
      setStatus({ kind: "ready" });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus({ kind: "error", message: (err as Error).message || "The model returned an error." });
    } finally {
      session?.destroy();
    }
  }, [summary]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = status.kind === "generating" || status.kind === "downloading";
  const canRun = status.kind === "ready" || status.kind === "downloadable" || status.kind === "error";

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-3.5">
        <div className="text-[13px] text-muted-foreground">
          <StatusLine status={status} />
        </div>
        {canRun ? (
          <button
            type="button"
            onClick={generate}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-[13px] font-medium text-background hover:opacity-90"
          >
            {status.kind === "downloadable" ? <Download className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {status.kind === "downloadable" ? "Download model and analyze" : saved ? "Regenerate" : "Analyze"}
          </button>
        ) : busy ? (
          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort();
              checkAvailability().then(setStatus);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] text-muted-foreground hover:bg-accent"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {status.kind === "downloading" ? `Downloading ${status.pct}%` : "Writing"} · Stop
          </button>
        ) : null}
      </div>

      {/* Output */}
      {text ? (
        <article className="rounded-lg border border-border bg-card px-6 py-5">
          {text.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="mb-4 text-[14px] leading-relaxed last:mb-0">
              {para}
              {i === text.split(/\n{2,}/).length - 1 && status.kind === "generating" ? (
                <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-foreground/70" />
              ) : null}
            </p>
          ))}
          {saved && status.kind !== "generating" ? (
            <p className="mt-5 border-t border-border pt-3 text-[12px] text-muted-foreground">
              Written {relative(new Date(saved.at))}.
              {new Date(summary.generatedAt) > new Date(saved.dataAt)
                ? " Your profile data has changed since then. Regenerate for a fresh take."
                : ""}
            </p>
          ) : null}
        </article>
      ) : status.kind === "unsupported" || status.kind === "unavailable" ? (
        <Setup unsupported={status.kind === "unsupported"} />
      ) : (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-[13px] text-muted-foreground">
          {status.kind === "generating" ? "Thinking." : "Nothing written yet. Hit Analyze."}
        </div>
      )}

      <p className="text-[12px] text-muted-foreground">
        Runs entirely in your browser with Chrome&apos;s built-in Gemini Nano. Your profile data is not sent to any AI service.
      </p>
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  switch (status.kind) {
    case "checking":
      return <>Checking for an on-device model.</>;
    case "unsupported":
      return <>This browser does not expose Chrome&apos;s built-in AI.</>;
    case "unavailable":
      return <>Built-in AI is present but the model is not available on this device.</>;
    case "downloadable":
      return <>Gemini Nano is not downloaded yet. It is about 2 GB and downloads once.</>;
    case "downloading":
      return <>Downloading the model. This only happens the first time.</>;
    case "ready":
      return <>Gemini Nano is ready on this device.</>;
    case "generating":
      return <>Writing your review.</>;
    case "error":
      return <span className="text-destructive">{status.message}</span>;
  }
}

function Setup({ unsupported }: { unsupported: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-6 py-5 text-[13px] leading-relaxed">
      <p className="font-medium">How to turn this on</p>
      <p className="mt-2 text-muted-foreground">
        {unsupported
          ? "Profile analysis uses Gemini Nano, which ships inside Google Chrome (version 138 or newer, desktop). Open this page in Chrome."
          : "Chrome found the API but the model is switched off. Enable it once:"}
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
        <li>
          Go to <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[12px]">chrome://flags/#prompt-api-for-gemini-nano</code> and set it to Enabled.
        </li>
        <li>
          Go to <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[12px]">chrome://flags/#optimization-guide-on-device-model</code> and set it to Enabled BypassPerfRequirement.
        </li>
        <li>Relaunch Chrome, then come back here. The first run downloads the model, about 2 GB.</li>
      </ol>
      <p className="mt-3 text-muted-foreground">Needs roughly 22 GB free disk and a machine with 4 GB or more of GPU memory or 16 GB of RAM.</p>
    </div>
  );
}

function relative(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
