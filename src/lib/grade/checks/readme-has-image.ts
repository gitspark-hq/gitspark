import type { Check } from "./types"

/** Fenced code blocks, which show image syntax rather than an image. */
const FENCED_BLOCK = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm

const IMAGE_PATTERNS = [
  /!\[[^\]]*\]\([^)]+\)/, // ![alt](path)
  /!\[[^\]]*\]\[[^\]]*\]/, // ![alt][ref], resolved further down the file
  /<img\b[^>]*>/i, // raw HTML, common for width and alignment
]

export const readmeHasImage: Check = {
  id: "readme-has-image",
  title: "README has an image",
  weight: 10,

  why: "A screenshot or diagram is the fastest way for someone to understand what a project is, and it is the first thing missing from almost every README.",

  howToFix: "Add a screenshot of the project running, or an architecture diagram, near the top of the README.",

  run: ({ readme }) => {
    // No README means no image, and adding one is real work, so this fails
    // rather than not applying.
    if (readme === null) return "fail"

    // Code fences come out first. A README documenting markdown syntax is
    // showing the reader how to write an image, not displaying one.
    const rendered = readme.replace(FENCED_BLOCK, "")

    return IMAGE_PATTERNS.some((pattern) => pattern.test(rendered))
      ? "pass"
      : "fail"
  },
}
