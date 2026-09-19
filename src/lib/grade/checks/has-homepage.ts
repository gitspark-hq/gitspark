import type { Check } from "./types"

/**
 * Root files that mark a repo as something that runs in a browser. This is
 * the whole test for "web project": a Python library with neither is not
 * asked for a URL, which is exactly what na exists for.
 */
const WEB_MARKERS = ["package.json", "index.html"]

export const hasHomepage: Check = {
  id: "has-homepage",
  title: "Live link for a web project",
  weight: 5,

  why: "A deployed link lets someone try the project in ten seconds instead of cloning it, and most visitors will only ever do the first.",

  howToFix: "Deploy it, then paste the URL into the Website field of the About panel on the repo page.",

  run: ({ repo, rootFiles }) => {
    const isWebProject = rootFiles.some((name) => WEB_MARKERS.includes(name))
    if (!isWebProject) return "na"

    return repo.homepage !== null && repo.homepage.trim().length > 0
      ? "pass"
      : "fail"
  },
}
