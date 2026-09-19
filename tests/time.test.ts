import { describe, it, expect } from "vitest";
import { localDayRange, localMidnightUtc, nowIn, tzOffsetMinutes } from "../src/lib/time";

describe("nowIn", () => {
  it("reports the local date across the UTC boundary", () => {
    // 2026-09-19 06:00Z is 2026-09-18 23:00 in Los Angeles (PDT, UTC-7)
    const at = new Date("2026-09-19T06:00:00Z");
    expect(nowIn("America/Los_Angeles", at)).toEqual({ hour: 23, date: "2026-09-18" });
    expect(nowIn("UTC", at)).toEqual({ hour: 6, date: "2026-09-19" });
    expect(nowIn("Asia/Kolkata", at)).toEqual({ hour: 11, date: "2026-09-19" });
  });

  it("falls back to UTC for an unknown zone", () => {
    const at = new Date("2026-09-19T06:00:00Z");
    expect(nowIn("Not/AZone", at).date).toBe("2026-09-19");
  });
});

describe("tzOffsetMinutes", () => {
  it("knows PDT vs PST", () => {
    expect(tzOffsetMinutes("America/Los_Angeles", new Date("2026-07-01T12:00:00Z"))).toBe(-420);
    expect(tzOffsetMinutes("America/Los_Angeles", new Date("2026-01-01T12:00:00Z"))).toBe(-480);
    expect(tzOffsetMinutes("Asia/Kolkata", new Date("2026-01-01T12:00:00Z"))).toBe(330);
  });
});

describe("localMidnightUtc / localDayRange", () => {
  it("maps LA midnight to 07:00Z in summer", () => {
    expect(localMidnightUtc("2026-09-18", "America/Los_Angeles").toISOString()).toBe("2026-09-18T07:00:00.000Z");
    const r = localDayRange("2026-09-18", "America/Los_Angeles");
    expect(r.from.toISOString()).toBe("2026-09-18T07:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-09-19T06:59:59.999Z");
  });

  it("handles the spring-forward DST day (23 hours long)", () => {
    // US DST starts 2026-03-08 at 02:00 local
    const r = localDayRange("2026-03-08", "America/Los_Angeles");
    expect(r.from.toISOString()).toBe("2026-03-08T08:00:00.000Z"); // PST midnight
    expect(r.to.toISOString()).toBe("2026-03-09T06:59:59.999Z"); // next PDT midnight - 1ms
    expect(r.to.getTime() - r.from.getTime() + 1).toBe(23 * 3600 * 1000);
  });

  it("is a no-op for UTC", () => {
    const r = localDayRange("2026-09-18", "UTC");
    expect(r.from.toISOString()).toBe("2026-09-18T00:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-09-18T23:59:59.999Z");
  });
});
