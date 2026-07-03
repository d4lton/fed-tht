import { FixedText } from '../types';
import { normalizedText } from '../text/normalize';

/**
 * The three ways a read of the government warning can land:
 * - `ok` — the words match and the required words are capitalized.
 * - `wrong-words` — a word is changed, dropped, or added.
 * - `bad-caps` — the words are right but a required word (GOVERNMENT WARNING) is
 *   not in capital letters.
 *
 * The regulation writes the body in sentence case, but labels may print the
 * whole thing in all caps — so we compare the *words* case-insensitively while
 * still insisting the capsWords appear in capitals. Collapsing that distinction
 * produces false rejections.
 */
export type WarningVerdict = 'ok' | 'wrong-words' | 'bad-caps';

export function checkWarning(read: string, fixed: FixedText): WarningVerdict {
  if (normalizedText(read) !== normalizedText(fixed.text)) {
    return 'wrong-words';
  }
  for (const capsWord of fixed.capsWords) {
    if (!read.includes(capsWord)) {
      return 'bad-caps';
    }
  }
  return 'ok';
}
