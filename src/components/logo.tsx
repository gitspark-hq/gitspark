/** Wordmark: plain text with a small glowing green dot — no icon box. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 font-semibold tracking-tight ${className}`}>
      <span>
        Git<span className="text-primary">Streak</span>
      </span>
      <span
        aria-hidden
        className="mb-[3px] h-1.5 w-1.5 self-center rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
      />
    </span>
  );
}
