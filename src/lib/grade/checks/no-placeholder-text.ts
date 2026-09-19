import type { Check } from "./types"

/**
 * Text that means the README was left half written. Each one is either
 * scaffolding nobody filled in or a note to self that shipped by accident.
 *
 * TODO counts. A roadmap belongs in issues, where it can be assigned and
 * closed, not in the file a visitor reads first.
 */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /\bTBD\b/i,
  /\[\s*fill (this )?in\s*\]/i,
  /\bcoming soon\b/i,
  /\blorem ipsum\b/i,
  /\byour (project|app|title|description) (name |title )?here\b/i,
  /<\s*(your|insert)[^>]*>/i,
  /\b(description|screenshot|badge)s? go(es)? here\b/i,
]

export const noPlaceholderText: Check = {
  id: "no-placeholder-text",
  title: "No leftover placeholders",
  weight: 8,

  why: "A leftover TODO or an unfilled template line tells a visitor the project was abandoned mid setup, whatever the code actually says.",

  howToFix: "Search the README for TODO, TBD, coming soon and template text, then either write the real content or delete the section.",

  run: ({ readme }) => {
    // Not applicable rather than a failure. A repo with no README has
    // nothing to clean up, and "remove your placeholder text" is not a fix
    // anyone can act on. readme-exists already charges it fifteen points
    // for the missing file; charging another eight for the contents of a
    // file that does not exist would be the same fault counted twice.
    if (readme === null) return "na"

    return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(readme))
      ? "fail"
      : "pass"
  },
}
