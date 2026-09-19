import type { Check } from "./types"

export const hasDescription: Check = {
  id: "has-description",
  title: "Has a description",
  weight: 12,

  why: "The description is the only text about your repo that appears in search results, on your profile, and anywhere the repo is listed.",

  howToFix: "Add a one line description in the About panel on the repo page, saying what the project does.",

  run: ({ repo }) =>
    repo.description !== null && repo.description.trim().length > 0
      ? "pass"
      : "fail",
}
