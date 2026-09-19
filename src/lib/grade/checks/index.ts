import { hasDescription } from "./has-description"
import { hasGitignore } from "./has-gitignore"
import { hasHomepage } from "./has-homepage"
import { hasLicense } from "./has-license"
import { hasRelease } from "./has-release"
import { hasTopics } from "./has-topics"
import { noPlaceholderText } from "./no-placeholder-text"
import { notEmptyFork } from "./not-empty-fork"
import { readmeExists } from "./readme-exists"
import { readmeHasImage } from "./readme-has-image"
import { readmeHasRunSteps } from "./readme-has-run-steps"
import { readmeSubstantial } from "./readme-substantial"
import { recentlyUpdated } from "./recently-updated"
import type { Check } from "./types"

export type { Check, CheckResult, RepoContext } from "./types"

/**
 * Every check GitGrade runs, in no particular order: the report card sorts
 * failures by points lost, so registry order does not reach the UI.
 *
 * Adding a check means one new file and one line here. Nothing else in the
 * codebase changes. Do not collapse these into a switch statement.
 */
export const checks: Check[] = [
  hasDescription,
  hasTopics,
  readmeExists,
  readmeSubstantial,
  readmeHasImage,
  readmeHasRunSteps,
  hasLicense,
  noPlaceholderText,
  notEmptyFork,
  hasHomepage,
  recentlyUpdated,
  hasGitignore,
  hasRelease,
]
