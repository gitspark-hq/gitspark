import type { Check } from "./types"

export const notEmptyFork: Check = {
  id: "not-empty-fork",
  title: "Not an untouched fork",
  weight: 8,

  why: "A fork with no commits of your own is someone else's project sitting on your profile, and a recruiter counting your repos will count it against you.",

  howToFix: "Either push your own commits to the fork or delete it. If you only wanted a bookmark, star the original instead.",

  run: ({ repo }) => {
    if (!repo.fork) return "pass"

    // Whether the owner has pushed since forking, read from two timestamps
    // the repo list already carries. Asking the commits endpoint would be
    // exact, but it costs a request per fork out of a budget of sixty an
    // hour, for an eight point rule.
    //
    // At fork time GitHub copies pushed_at from the parent, so on an
    // untouched fork it is at or before created_at. Any push by the owner
    // moves it past. A null pushed_at is an empty repo, which is untouched
    // by definition.
    if (repo.pushed_at === null) return "fail"

    return new Date(repo.pushed_at) > new Date(repo.created_at)
      ? "pass"
      : "fail"
  },
}
