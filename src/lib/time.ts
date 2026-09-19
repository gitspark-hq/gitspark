/** Hour (0-23) and YYYY-MM-DD in the given IANA timezone, right now. */
export function nowIn(timezone: string, now = new Date()) {
  let tz = timezone;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = Number(get("hour")) % 24; // Intl may return "24" at midnight
  return { hour, date: `${get("year")}-${get("month")}-${get("day")}` };
}
