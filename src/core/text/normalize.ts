/**
 * Small, pure text helpers for the lenient comparisons the judge needs. Word
 * based, not substring based, so `gin` never matches `imagine` and `rum` never
 * matches `spectrum`.
 */

/** Split into lowercase word tokens (letters and digits), dropping punctuation. */
export function words(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** Canonical form: lowercase word tokens joined by single spaces. */
export function normalizedText(value: string): string {
  return words(value).join(" ");
}

/**
 * True when `needle`'s words appear as a contiguous run within `haystack`'s
 * words. Used for the loose name-and-address match (the label wraps the
 * producer in words like "Bottled by …, City, ST") and for designation core
 * terms (a core term sitting inside a longer phrase).
 */
export function containsPhrase(haystack: string, needle: string): boolean {
  const haystackWords = words(haystack);
  const needleWords = words(needle);
  if (needleWords.length === 0 || needleWords.length > haystackWords.length) {
    return false;
  }
  for (let i = 0; i + needleWords.length <= haystackWords.length; i++) {
    let matched = true;
    for (let j = 0; j < needleWords.length; j++) {
      if (haystackWords[i + j] !== needleWords[j]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }
  return false;
}

/** Equal ignoring case and punctuation (the lenient brand comparison). */
export function equalsLenient(a: string, b: string): boolean {
  return normalizedText(a) === normalizedText(b);
}
