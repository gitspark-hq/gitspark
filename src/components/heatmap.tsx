import { addDays } from "@/lib/streak";

type Props = {
  counts: Map<string, number>;
  today: string;
  goal: number;
  weeks?: number;
  cell?: number;
};

const LEVELS = ["bg-white/[0.07]", "bg-success/30", "bg-success/55", "bg-success/80", "bg-success"];

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
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col" style={{ gap }}>
        <div className="flex text-[10px] text-muted-foreground" style={{ gap }}>
          {monthLabels.map((m, i) => (
            <div key={i} className="shrink-0 whitespace-nowrap" style={{ width: cell }}>{m}</div>
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
                    className={`rounded-[2px] ${future ? "bg-transparent" : LEVELS[level(c, goal)]} ${
                      date === today ? "outline outline-1 outline-offset-1 outline-foreground/50" : ""
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1 self-end text-[10px] text-muted-foreground">
          Less
          {LEVELS.map((cls, i) => (
            <div key={i} style={size} className={`rounded-[2px] ${cls}`} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
