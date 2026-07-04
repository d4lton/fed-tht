import {FixedText} from "../types";
import {containsPhrase} from "../text/normalize";

/**
 * The four ways a read of the government warning can land:
 * - `ok` — the words match and the required words are capitalized.
 * - `wrong-words` — a word is changed, dropped, or added — a genuinely different
 *   warning.
 * - `bad-caps` — the words are right but a required word (GOVERNMENT WARNING) is
 *   not in capital letters.
 * - `unreadable` — the words don't match exactly, but the read is *so close* to
 *   the required wording that the difference is a poor read, not a wrong warning
 *   (a sideways or low-quality print where OCR runs words together or drops a
 *   letter). We say "couldn't read it," not "it's wrong," and leave it for a
 *   human (or a sharper re-read) rather than assert non-compliance.
 *
 * The regulation writes the body in sentence case, but labels may print the
 * whole thing in all caps — so we compare the *words* case-insensitively while
 * still insisting the capsWords appear in capitals. Collapsing that distinction
 * produces false rejections.
 *
 * The required wording must appear as a contiguous run within the read, rather
 * than being the whole of it: labels print net contents, a sulfite line, or a
 * barcode right below the warning, and the reader hands that trailing text
 * through. Anchoring to the known wording (not to an exact length) is what keeps
 * that from reading as a changed word.
 */
export type WarningVerdict = "ok" | "wrong-words" | "bad-caps" | "unreadable";

/** At/above this character-level similarity, a non-exact read is a poor read, not a wrong warning. */
const NEAR_MISS_SIMILARITY = 0.9;

export function checkWarning(read: string, fixed: FixedText): WarningVerdict {
  if (!containsPhrase(read, fixed.text)) {
    // Not an exact word match. Distinguish "read badly" from "genuinely wrong"
    // by how close the letters are once spacing/punctuation (where OCR fails) is
    // set aside — merged words and a dropped letter score as near-misses.
    return similarity(read, fixed.text) >= NEAR_MISS_SIMILARITY ? "unreadable" : "wrong-words";
  }
  for (const capsWord of fixed.capsWords) {
    if (!read.includes(capsWord)) {
      return "bad-caps";
    }
  }
  return "ok";
}

/** Lowercase letters and digits only — the form OCR spacing/punctuation errors can't disturb. */
function squash(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * How close the required wording is to its best match *within* the read, from 0
 * (nothing alike) to 1 (present exactly). Spacing and punctuation are dropped
 * first, so "your ability"→"yourability" and "car or"→"caror" cost nothing; only
 * real letter differences (a dropped "s" in "problems") count.
 */
function similarity(read: string, expected: string): number {
  const needle = squash(expected);
  const haystack = squash(read);
  if (needle.length === 0) {
    return 0;
  }
  return 1 - approxSubstringDistance(needle, haystack) / needle.length;
}

/** Fewest single-character edits to match `needle` against some substring of `haystack`. */
function approxSubstringDistance(needle: string, haystack: string): number {
  // Row 0 is all zeros: an empty needle matches at any position for free, so the
  // match may start anywhere in the haystack.
  let previous = new Array<number>(haystack.length + 1).fill(0);
  for (let i = 1; i <= needle.length; i++) {
    const current = new Array<number>(haystack.length + 1);
    current[0] = i;
    for (let j = 1; j <= haystack.length; j++) {
      const substitution = needle[i - 1] === haystack[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + substitution);
    }
    previous = current;
  }
  // The match may end anywhere, so take the cheapest end position.
  return Math.min(...previous);
}
