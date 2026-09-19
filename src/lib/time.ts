/** Time helpers for working in a user's IANA timezone without a date library. */

export function safeTimezone(tz: string): string {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

function parts(tz: string, at: Date) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") % 24, min: get("minute"), s: get("second") };
}

/** Hour (0-23) and YYYY-MM-DD in the given timezone, right now (or at `now`). */
export function nowIn(timezone: string, now = new Date()) {
  const { y, m, d, h } = parts(safeTimezone(timezone), now);
  return { hour: h, date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

/** Offset (minutes) of `tz` from UTC at the instant `at`; positive east of UTC. */
export function tzOffsetMinutes(tz: string, at: Date): number {
  const { y, m, d, h, min, s } = parts(tz, at);
  const asUtc = Date.UTC(y, m - 1, d, h, min, s);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** The UTC instant at which local date `date` (YYYY-MM-DD) begins in `tz`. Handles DST edges. */
export function localMidnightUtc(date: string, tz: string): Date {
  const zone = safeTimezone(tz);
  const naive = new Date(date + "T00:00:00Z").getTime();
  // Local midnight = naive - offset. Iterate once more in case the offset differs at the answer (DST).
  let guess = new Date(naive - tzOffsetMinutes(zone, new Date(naive)) * 60000);
  guess = new Date(naive - tzOffsetMinutes(zone, guess) * 60000);
  return guess;
}

/** [start, end] UTC instants covering the whole local day `date` in `tz`. */
export function localDayRange(date: string, tz: string): { from: Date; to: Date } {
  const from = localMidnightUtc(date, tz);
  const nextDate = new Date(date + "T00:00:00Z");
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const to = new Date(localMidnightUtc(nextDate.toISOString().slice(0, 10), tz).getTime() - 1);
  return { from, to };
}

/** Short zone label like "PDT" or "GMT+2" for display. */
export function tzAbbrev(tz: string, at = new Date()): string {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: safeTimezone(tz), timeZoneName: "short" }).formatToParts(at);
  return p.find((x) => x.type === "timeZoneName")?.value ?? tz;
}
