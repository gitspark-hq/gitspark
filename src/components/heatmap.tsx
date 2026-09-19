import { addDays } from "@/lib/streak";

type Props = {
  /** Map of YYYY-MM-DD -> total contributions. */
  counts: Map<string, number>;
  today: string;
  goal: number;
  weeks?: number;
};

const LEVELS = [
  "bg-muted",
  "bg-green-200 dark:bg-green-900",
  "bg-green-400 dark:bg-green-700",
  "bg-green-600 dark:bg-green-500",
  "bg-green-800 dark:bg-green-300",
];

function level(count: number, goal: number) {
  if (count === 0) return 0;
  if (count < goal) return 1;
  if (count < goal * 3) return 2;
  if (count < goal * 6) return 3;
  return 4;
}

/** GitHub-style 52-week contribution grid. Columns are weeks (Sun–Sat), oldest on the left. */
export function Heatmap({ counts, today, goal, weeks = 52 }: Props) {
  const todayDow = new Date(today + "T00:00:00Z").getUTCDay(); // 0 = Sun
  // Start on the Sunday `weeks-1` weeks before this week's Sunday.
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

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-[3px] text-[10px] text-muted-foreground">
          {monthLabels.map((m, i) => (
            <div key={i} className="w-[11px] shrink-0">{m}</div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map((date) => {
                const future = date > today;
                const c = counts.get(date) ?? 0;
                return (
                  <div
                    key={date}
                    title={future ? "" : `${date}: ${c} contribution${c === 1 ? "" : "s"}`}
                    className={`h-[11px] w-[11px] rounded-[2px] ${
                      future ? "bg-transparent" : LEVELS[level(c, goal)]
                    } ${date === today ? "ring-1 ring-foreground/60" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1 self-end text-[10px] text-muted-foreground">
          Less
          {LEVELS.map((cls, i) => (
            <div key={i} className={`h-[11px] w-[11px] rounded-[2px] ${cls}`} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
