import {Designation} from "../types";
import {containsPhrase} from "../text/normalize";

/**
 * True when the phrase contains a known legal core term (e.g. "bourbon" inside
 * "Kentucky Straight Bourbon Whiskey"). This is the judge's own authoritative
 * check against the compiled list — it does not trust the reader's basis flag.
 * See Checking the Class/Type Designation.
 */
export function matchesDesignation(phrase: string, designations: Designation[]): boolean {
  return designations.some((designation) => designation.coreTerms.some((term) => containsPhrase(phrase, term)));
}
