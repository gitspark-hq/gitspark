import type { ProfileSummary } from "./profile-summary";

/**
 * Nano is a small model. The system prompt does the heavy lifting on tone:
 * plain, specific, no filler. The user prompt is a compact fact sheet so the
 * model has numbers to point at instead of adjectives.
 */
export const SYSTEM_PROMPT = `You review GitHub profiles for developers who want honest feedback. Write like a senior engineer talking to a peer over coffee. Plain English, second person, specific.

Rules you must follow:
- Never use an em dash or en dash. Use a comma, a period, or the word "and" instead.
- No headings, no bullet points, no numbered lists, no bold text. Write three or four short paragraphs.
- Do not open with a greeting, a compliment, or a summary of what you are about to say. Start with the most important observation.
- Do not use these words: leverage, showcase, robust, delve, journey, vibrant, testament, tapestry, elevate, embark, foster, streamline, comprehensive, crucial, seamless.
- Quote the actual numbers you were given. Do not invent facts, repos, or numbers.
- Be direct about weak spots. Say what to do about them in one sentence each.
- End with one concrete thing to do this week. One sentence. No sign-off.
- Keep it under 220 words.`;

function plural(n: number, one: string, many = one + "s") {
  return `${n} ${n === 1 ? one : many}`;
}

export function buildUserPrompt(p: ProfileSummary): string {
  const a = p.activity;
  const lines: string[] = [
    `GitHub user: ${p.login}`,
    ``,
    `Activity over the last year:`,
    `- Current streak ${plural(a.currentStreak, "day")}, longest ${plural(a.longestStreak, "day")}, daily goal ${a.dailyGoal}.`,
    `- Active on ${a.activeDaysLast90} of the last 90 days and ${a.activeDaysLast365} of the last 365.`,
    `- ${a.commits365} commits, ${a.prs365} pull requests, ${a.reviews365} code reviews, ${a.issues365} issues.`,
  ];
  if (a.recentRepos.length) {
    lines.push(
      `- Last 30 days by repo: ${a.recentRepos.map((r) => `${r.repo.split("/")[1]} (${r.commits} commits${r.prs ? `, ${r.prs} PRs` : ""})`).join(", ")}.`,
    );
  } else {
    lines.push(`- No activity in the last 30 days.`);
  }

  if (p.grade) {
    const g = p.grade;
    lines.push(``, `Repo quality (public repos scored 0-100 on README, description, license, topics, and similar):`);
    lines.push(`- Account grade ${g.letter}, ${g.score}/100 across ${plural(g.repoCount, "repo")}.`);
    if (g.patterns.length) {
      lines.push(`- Most common problems: ${g.patterns.map((x) => `${x.check.toLowerCase()} (${x.failing} of ${x.of} repos)`).join("; ")}.`);
    }
    if (g.worst.length) {
      lines.push(`- Weakest repos: ${g.worst.map((w) => `${w.name} ${w.score}/100${w.fails.length ? ` (missing ${w.fails.slice(0, 3).map((f) => f.toLowerCase()).join(", ")})` : ""}`).join("; ")}.`);
    }
    if (g.best.length) {
      lines.push(`- Strongest repos: ${g.best.map((b) => `${b.name} ${b.score}/100`).join(", ")}.`);
    }
  } else {
    lines.push(``, `Repo quality has not been graded yet.`);
  }

  lines.push(``, `Write the review now.`);
  return lines.join("\n");
}

/**
 * Last line of defence on tone. The model is told not to do these things,
 * but small models drift, and a stray em dash is exactly what makes text read
 * as generated.
 */
export function cleanOutput(text: string): string {
  return (
    text
      .replace(/\s*[—–]\s*/g, ", ")
      // "Sure, here's a review:" style openers, whole first line only.
      .replace(/^\s*(?:sure|certainly|okay|of course|absolutely)?[,!]?\s*(?:here(?:'s| is)[^\n]*)?(?::|\.)?\s*\n+/i, "")
      .replace(/^#+\s*/gm, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/^\s*[-*•]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
