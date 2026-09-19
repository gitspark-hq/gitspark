import type { Check } from "./types"

export const hasRelease: Check = {
  id: "has-release",
  title: "Has a tagged release",
  weight: 2,

  why: "A release says the project reached a state you would put a version number on, which is a different claim from a repo that is always mid-change.",

  howToFix: "Tag a version and publish it from the Releases page on the repo, with two lines on what is in it.",

  run: ({ releaseCount }) => {
    // Undefined means not looked up yet, or not looked up at all because
    // the rate limit could not spare a request per repo. Either way it is
    // not a fact about the repo, so it drops out of the denominator rather
    // than counting as a failure.
    if (releaseCount === undefined) return "na"
    return releaseCount > 0 ? "pass" : "fail"
  },
}
