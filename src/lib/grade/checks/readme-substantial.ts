import type { Check } from "./types"

/**
 * Characters of README needed to pass, not counting the repo name. Flat,
 * not scaled to repo size: a small project still has to explain itself,
 * and a threshold that moved with the code would be unpredictable.
 */
const MIN_CHARACTERS = 400

/** Every mention of the repo name, so padding with it does not count. */
function withoutRepoName(readme: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return readme.replace(new RegExp(escaped, "gi"), "")
}

export const readmeSubstantial: Check = {
  id: "readme-substantial",
  title: "README says something",
  weight: 10,

  why: "A README that is just the repo name and a badge tells a visitor nothing they could not already see from the repo page.",

  howToFix: `Write at least ${MIN_CHARACTERS} characters covering what the project does, why it exists, and how to run it.`,

  run: ({ repo, readme }) => {
    // No README says nothing, so this fails rather than not applying. The
    // fix, write more, is real work the repo has not done.
    if (readme === null) return "fail"

    return withoutRepoName(readme, repo.name).trim().length >= MIN_CHARACTERS
      ? "pass"
      : "fail"
  },
}
