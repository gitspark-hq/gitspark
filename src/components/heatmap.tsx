import { addDays } from "@/lib/streak";

type Props = {
  /** Map of YYYY-MM-DD -> total contributions. */
  counts: Map<string, number>;
  today: string;
  goal: number;
  weeks?: number;
  /** Cell size in px. */
  cell?: number;
};

const LEVELS = [
  "bg-white/[0.06]",
  "bg-primary/25",
  "bg-primary/50",
  "bg-primary/75",
  "bg-primary shadow-[0_0_6px_-1px_var(--primary)]",
];

function level(count: number, goal: number) {
  if (count === 0) return 0;
  if (count < goal) return 1;
  if (count < goal * 3) return 2;
  if (count < goal * 6) return 3;
  return 4;
}

/** GitHub-style contribution grid. Columns are weeks (Sun–Sat), oldest on the left. */
export function Heatmap({ counts, today, goal, weeks = 52, cell = 11 }: Props) {
  const todayDow = new Date(today + "T00:00:00Z").getUTCDay();
  const start = addDays(today, -(todayDow + (weeks - 1) * 7));

  const columns: string[][] = [];
  let cursor = start;
  for (let w = 0; w < weeks; w++) {
    const col: string[] = [];
    for (let d = 0; d < 7; d++) {
      col.push(cursor);
      cursor = addDays(cursor, 1);
    }
    columns.push(col);
  }

  const monthLabels = columns.map((col, i) => {
    const first = col[0];
    const prev = i > 0 ? columns[i - 1][0] : null;
    return prev && first.slice(0, 7) !== prev.slice(0, 7)
      ? new Date(first + "T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" })
      : "";
  });

  const gap = 3;
  const size = { width: cell, height: cell };

  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex flex-col" style={{ gap }}>
        <div className="flex text-[10px] font-medium text-muted-foreground" style={{ gap }}>
          {monthLabels.map((m, i) => (
            <div key={i} className="shrink-0 overflow-visible whitespace-nowrap" style={{ width: cell }}>
              {m}
            </div>
          ))}
        </div>
        <div className="flex" style={{ gap }}>
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col" style={{ gap }}>
              {col.map((date) => {
                const future = date > today;
                const c = counts.get(date) ?? 0;
                return (
                  <div
                    key={date}
                    style={size}
                    title={future ? "" : `${date}: ${c} contribution${c === 1 ? "" : "s"}`}
                    className={`rounded-[3px] transition-transform hover:scale-125 ${
                      future ? "bg-transparent" : LEVELS[level(c, goal)]
                    } ${date === today ? "ring-1 ring-foreground/70 ring-offset-1 ring-offset-background" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1 self-end text-[10px] text-muted-foreground">
          Less
          {LEVELS.map((cls, i) => (
            <div key={i} style={size} className={`rounded-[3px] ${cls}`} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
