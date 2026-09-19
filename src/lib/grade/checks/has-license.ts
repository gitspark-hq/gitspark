import type { Check } from "./types"

export const hasLicense: Check = {
  id: "has-license",
  title: "Has a license",
  weight: 8,

  why: "Without a license nobody can legally use your code, and a company that finds it interesting has to assume they are not allowed to.",

  howToFix: "Add a LICENSE file from the repo page: Add file, then Choose a license template, then MIT if you have no reason to pick another.",

  // Whatever GitHub detected, including the "other" key it uses for a
  // license file it cannot identify. The rule is that the repo states its
  // terms somewhere, not that it picked a license from a shortlist.
  run: ({ repo }) => (repo.license !== null ? "pass" : "fail"),
}
