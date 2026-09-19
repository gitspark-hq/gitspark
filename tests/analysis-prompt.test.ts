import { describe, it, expect } from "vitest";
import { cleanOutput, SYSTEM_PROMPT } from "../src/lib/analysis-prompt";

describe("cleanOutput", () => {
  it("removes em and en dashes", () => {
    expect(cleanOutput("Good pace — keep it up – really")).toBe("Good pace, keep it up, really");
    expect(cleanOutput("x—y")).not.toMatch(/[—–]/);
  });

  it("strips chatty openers and markdown scaffolding", () => {
    const raw = "Sure, here's a review:\n\n## Overview\n**Your** streak is 3.\n- point one\n1. point two";
    const out = cleanOutput(raw);
    expect(out.startsWith("Overview")).toBe(true);
    expect(out).not.toMatch(/\*\*|^#|^- |^\d\. /m);
  });

  it("leaves ordinary text alone", () => {
    expect(cleanOutput("You pushed 43 commits in 7 days.")).toBe("You pushed 43 commits in 7 days.");
  });
});

describe("SYSTEM_PROMPT", () => {
  it("forbids dashes and lists explicitly", () => {
    expect(SYSTEM_PROMPT).toMatch(/em dash/i);
    expect(SYSTEM_PROMPT).toMatch(/no bullet points/i);
  });
});

import { cleanFixes } from "../src/lib/analysis-prompt";

describe("cleanFixes", () => {
  it("turns a messy model list into clean lines", () => {
    const raw = "Here is your list:\n1. **gitgrade**: add a license — MIT is fine.\n- nura-app: write a README\n\n3) Habit: open one PR this week\n";
    expect(cleanFixes(raw)).toEqual([
      "gitgrade: add a license, MIT is fine.",
      "nura-app: write a README",
      "Habit: open one PR this week",
    ]);
  });

  it("caps at seven", () => {
    const raw = Array.from({ length: 10 }, (_, i) => `r${i}: fix`).join("\n");
    expect(cleanFixes(raw)).toHaveLength(7);
  });
});
