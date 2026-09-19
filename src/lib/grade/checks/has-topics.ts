import type { Check } from "./types"

export const hasTopics: Check = {
  id: "has-topics",
  title: "Has topics",
  weight: 6,

  why: "Topics are how anyone browsing GitHub by language or library finds a repo they were not already looking for.",

  howToFix: "Add three to five topics in the About panel, naming the language and the main libraries the project uses.",

  run: ({ repo }) => (repo.topics.length > 0 ? "pass" : "fail"),
}
