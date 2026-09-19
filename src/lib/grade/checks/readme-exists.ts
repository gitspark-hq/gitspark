import type { Check } from "./types"

export const readmeExists: Check = {
  id: "readme-exists",
  title: "Has a README",
  weight: 15,

  why: "The README is the only thing most visitors read, and a repo without one gives them nothing to read at all.",

  howToFix: "Add a README.md in the repo root saying what the project does, why it exists, and how to run it.",

  // Presence only. A README that exists but says nothing still passes here
  // and fails readme-substantial, which is the check that judges content.
  // Splitting it this way keeps the fix list honest: "write a README" and
  // "say more in your README" are different jobs, and a repo should not be
  // told to do the first one when it has already done it.
  run: ({ readme }) => (readme !== null ? "pass" : "fail"),
}
