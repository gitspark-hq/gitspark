import type { Check } from "./types"

export const hasGitignore: Check = {
  id: "has-gitignore",
  title: "Has a .gitignore",
  weight: 2,

  why: "Without one, build output, editor files and the occasional .env end up committed, and a committed .env is the kind of thing a recruiter remembers.",

  howToFix: "Add a .gitignore in the repo root. GitHub offers a template for every major language when you create the file.",

  // Exact name in the root listing. GitHub honours .gitignore files in
  // subdirectories too, but a repo whose only one is nested has still left
  // the root unguarded, which is where the .env goes.
  run: ({ rootFiles }) => (rootFiles.includes(".gitignore") ? "pass" : "fail"),
}
