"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import type { ProfileSummary } from "@/lib/profile-summary";
import { buildFixesPrompt, buildUserPrompt, cleanFixes, cleanOutput, FIXES_SYSTEM_PROMPT, SYSTEM_PROMPT } from "@/lib/analysis-prompt";

type Status =
  | { kind: "checking" }
  | { kind: "unsupported" }
  | { kind: "unavailable" }
  | { kind: "downloadable" }
  | { kind: "downloading"; pct: number }
  | { kind: "ready" }
  | { kind: "generating"; phase: "read" | "fixes" }
  | { kind: "error"; message: string };

type Saved = { text: string; fixes: string[]; at: string; dataAt: string; fingerprint: string };

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

/**
 * The saved analysis is the source of truth and comes from the server. It is
 * only replaced when the user clicks Regenerate, or automatically when the
 * profile data has changed since it was written and the model is ready.
 */
export function ProfileAnalysis({ summary, initialSaved }: { summary: ProfileSummary; initialSaved: Saved | null }) {
  const [status, setStatus] = useState<Status>({ kind: "checking" });
  const [saved, setSaved] = useState<Saved | null>(initialSaved);
  const [text, setText] = useState(() => saved?.text ?? "");
  const [fixes, setFixes] = useState<string[]>(() => saved?.fixes ?? []);
  const abortRef = useRef<AbortController | null>(null);
  const autoRan = useRef(false);
  // "Changed" means the numbers the model sees differ, not merely that a sync ran.
  const stale = saved ? saved.fingerprint !== summary.fingerprint : false;

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

    setStatus({ kind: "generating", phase: "read" });
    setText("");
    setFixes([]);
    const sessions: LanguageModelSession[] = [];
    const open = async (system: string) => {
      const session = await lm.create({
        initialPrompts: [{ role: "system", content: system }],
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
      sessions.push(session);
      return session;
    };
    const stream = async (session: LanguageModelSession, prompt: string, onChunk: (acc: string) => void) => {
      let acc = "";
      const reader = session.promptStreaming(prompt, { signal: ac.signal }).getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += value;
        onChunk(acc);
      }
      return acc;
    };

    try {
      // Pass 1: the read.
      const readSession = await open(SYSTEM_PROMPT);
      setStatus({ kind: "generating", phase: "read" });
      const rawRead = await stream(readSession, buildUserPrompt(summary), (acc) => setText(cleanOutput(acc)));
      const finalText = cleanOutput(rawRead);
      setText(finalText);

      // Pass 2: the fix list, in its own session so the list format doesn't fight the prose rules.
      setStatus({ kind: "generating", phase: "fixes" });
      const fixSession = await open(FIXES_SYSTEM_PROMPT);
      const rawFixes = await stream(fixSession, buildFixesPrompt(summary), (acc) => setFixes(cleanFixes(acc)));
      const finalFixes = cleanFixes(rawFixes);
      setFixes(finalFixes);

      const s: Saved = { text: finalText, fixes: finalFixes, at: new Date().toISOString(), dataAt: summary.generatedAt, fingerprint: summary.fingerprint };
      setSaved(s);
      await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: s.text, fixes: s.fixes, dataAt: s.dataAt, fingerprint: s.fingerprint }),
      }).catch(() => undefined);
      setStatus({ kind: "ready" });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus({ kind: "error", message: (err as Error).message || "The model returned an error." });
    } finally {
      for (const sess of sessions) sess.destroy();
    }
  }, [summary]);

  useEffect(() => {
    if (status.kind === "ready" && saved && stale && !autoRan.current) {
      autoRan.current = true;
      void generate();
    }
  }, [status.kind, saved, stale, generate]);

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
      {status.kind === "unsupported" || status.kind === "unavailable" ? (
        <Setup unsupported={status.kind === "unsupported"} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Pane title="The read" active={status.kind === "generating" && status.phase === "read"} empty={!text}>
            {text.split(/\n{2,}/).map((para, i, arr) => (
              <p key={i} className="mb-4 text-[14px] leading-relaxed last:mb-0">
                {para}
                {i === arr.length - 1 && status.kind === "generating" && status.phase === "read" ? <Cursor /> : null}
              </p>
            ))}
          </Pane>

          <Pane title="What to fix" active={status.kind === "generating" && status.phase === "fixes"} empty={fixes.length === 0}>
            <ol className="space-y-3">
              {fixes.map((line, i) => {
                const idx = line.indexOf(":");
                const head = idx > 0 && idx < 40 ? line.slice(0, idx) : null;
                const body = head ? line.slice(idx + 1).trim() : line;
                return (
                  <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
                    <span className="mt-[3px] w-5 shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">{i + 1}</span>
                    <span>
                      {head ? <span className="font-medium">{head}</span> : null}
                      {head ? <span className="text-muted-foreground">: </span> : null}
                      {body}
                      {i === fixes.length - 1 && status.kind === "generating" && status.phase === "fixes" ? <Cursor /> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Pane>

          {saved && status.kind !== "generating" ? (
            <p className="text-[12px] text-muted-foreground lg:col-span-2">
              Written {relative(new Date(saved.at))}. Stays the same until your profile changes or you regenerate.
              {stale ? " Your profile has changed since then." : ""}
            </p>
          ) : null}
        </div>
      )}

      <p className="text-[12px] text-muted-foreground">
        Written on your device using the model built into Chrome. Your profile data is not sent to any AI service.
      </p>
    </div>
  );
}

function Pane({ title, active, empty, children }: { title: string; active: boolean; empty: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="text-[14px] font-medium">{title}</h2>
        {active ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
      </header>
      <div className="px-5 py-5">
        {empty ? (
          <p className="text-[13px] text-muted-foreground">{active ? "Thinking." : "Nothing here yet."}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Cursor() {
  return <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-foreground/70" />;
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
      return <>The on-device model is not downloaded yet. It is about 2 GB and downloads once.</>;
    case "downloading":
      return <>Downloading the model. This only happens the first time.</>;
    case "ready":
      return <>Ready. Saved to your account, same on every device.</>;
    case "generating":
      return <>{status.phase === "read" ? "Writing the read." : "Working out the fixes."}</>;
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
          ? "Profile analysis uses the AI model built into Google Chrome (version 138 or newer, desktop). Open this page in Chrome."
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
