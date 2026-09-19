import type { Check } from "./types"

/** Body of a fenced block, without the fence lines themselves. */
const FENCED_BLOCK = /^(```|~~~)[^\n]*\n([\s\S]*?)^\1[^\n]*$/gm

/**
 * A line indented by four spaces or a tab. GitHub renders these as code
 * too, and plenty of READMEs written in plain markdown use them instead of
 * fences, so a check that only read fences would fail repos that do show
 * their commands.
 */
const INDENTED_LINE = /^(?: {4}|\t)(.+)$/gm

/**
 * Commands that mean "this is how you install or run it". Deliberately a
 * list of ecosystems rather than a guess at shell grammar: a wrong pass here
 * tells someone their README explains how to run the project when it does
 * not, which is worse than a wrong fail they can look at and argue with.
 */
const COMMAND_PATTERNS: RegExp[] = [
  /\b(npm|pnpm|yarn|bun)\s+(i|install|ci|add|run|start|test|dev|build)\b/i,
  /\bnpx\s+\S/i,
  /\b(node|deno|ts-node|tsx)\s+\S+/i,
  /\bpip3?\s+install\b/i,
  /\b(poetry|pipenv|uv|conda)\s+(install|add|run|sync|shell)\b/i,
  /\bpython3?\s+(-m\s+)?\S+/i,
  /\bcargo\s+(run|build|install|test)\b/i,
  /\bgo\s+(run|build|install|get|test)\b/i,
  /\b(docker|podman)\s+(run|build|compose)\b/i,
  /\bdocker-compose\s+up\b/i,
  /\bmake\b/,
  /\b(cmake|\.\/configure)\b/,
  /\b(mvn|gradle|\.\/gradlew|sbt)\s+\S+/i,
  /\bbundle\s+(install|exec)\b/i,
  /\b(gem|brew|apt|apt-get|dnf|pacman)\s+install\b/i,
  /\bcomposer\s+install\b/i,
  /\bdotnet\s+(run|build|restore)\b/i,
  /\bflutter\s+(run|pub)\b/i,
  /\bterraform\s+(init|apply|plan)\b/i,
  /\b(git\s+clone)\b/i,
]

/** Every line GitHub renders as code, fenced or indented, as one string. */
function codeLines(readme: string): string {
  const fenced = [...readme.matchAll(FENCED_BLOCK)].map((match) => match[2])
  const withoutFences = readme.replace(FENCED_BLOCK, "")
  const indented = [...withoutFences.matchAll(INDENTED_LINE)].map(
    (match) => match[1],
  )
  return [...fenced, ...indented].join("\n")
}

export const readmeHasRunSteps: Check = {
  id: "readme-has-run-steps",
  title: "Explains how to run it",
  weight: 10,

  why: "Someone who cannot work out how to run your project in under a minute closes the tab, and prose alone rarely gets them there.",

  howToFix: "Add a section with the install and run commands in a code block, exactly as you would type them.",

  run: ({ readme }) => {
    // No README cannot explain anything, and writing the section is real
    // work, so this fails rather than not applying.
    if (readme === null) return "fail"

    const code = codeLines(readme)
    return COMMAND_PATTERNS.some((pattern) => pattern.test(code))
      ? "pass"
      : "fail"
  },
}
