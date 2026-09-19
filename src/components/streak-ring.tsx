import { Flame } from "lucide-react";

type Props = {
  streak: number;
  /** 0..1 progress toward today's goal. */
  progress: number;
  atRisk: boolean;
  goalMet: boolean;
};

/** Circular progress ring with the current streak in the middle. */
export function StreakRing({ streak, progress, atRisk, goalMet }: Props) {
  const size = 180;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, Math.max(0, progress));
  const tone = goalMet ? "text-primary" : atRisk ? "text-warning" : "text-primary";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-white/[0.06]" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          className={`${tone} transition-[stroke-dasharray] duration-700 ease-out`}
          style={{ filter: goalMet ? "drop-shadow(0 0 10px var(--primary))" : undefined }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Flame className={`h-7 w-7 ${goalMet ? "text-primary" : atRisk ? "text-warning" : "text-muted-foreground"}`} strokeWidth={2.25} />
        <div className="mt-1 text-5xl font-bold tabular-nums tracking-tight">{streak}</div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">day streak</div>
      </div>
    </div>
  );
}
