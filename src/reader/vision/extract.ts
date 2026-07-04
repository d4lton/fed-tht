import {containsSubsequence, DrinkType, FieldRead, matchesDesignation, words} from "../../core";
import {ThingsToLookFor} from "../label-reader";

/**
 * A net-contents volume: a number followed by a unit, covering the common
 * spellings and abbreviations a label uses (ml, liter, centiliter, fluid ounce,
 * pint, quart, gallon). Longer forms come first so "milliliters" isn't matched
 * as a bare "l". Word-anchored so a unit never matches inside another word.
 */
const VOLUME =
  /\b\d+(?:\.\d+)?\s*(?:milliliters?|millilitres?|ml|centiliters?|centilitres?|cl|liters?|litres?|l|fluid\s+ounces?|fl\.?\s*oz\.?|ounces?|oz|pints?|pt|quarts?|qt|gallons?|gal)\b/i;

/** A percentage, an alcohol word (in any order), and a proof figure. */
const PERCENT = /\d{1,2}(?:\.\d+)?\s*%/;
const ALCOHOL_WORD = /\b(?:alc(?:ohol)?|abv)\b/i;
const PROOF = /\b\d{1,3}(?:\.\d+)?\s*proof\b/i;

/**
 * Turn the flat text an OCR reader gets back into the label-report shape — one
 * observation per field. This is the OCR reader's "describe" step done in plain
 * code instead of by a model: it only reports what the text shows (found /
 * absent, the text, and whether it could be anchored to a known value); it never
 * decides pass or fail. The judge makes every verdict, exactly as before.
 *
 * Fields are found by anchoring to known values (see "Anchored extraction"),
 * never by where they sit on the label: the expected brand and name/address, the
 * fixed warning wording, and the legal designations are searched for across the
 * whole text.
 *
 * The expected brand and name/address are matched as a word subsequence (in
 * order, gaps allowed), since a label splits a producer's name from its city and
 * state with other text in between.
 *
 * Known limits of doing this without a model, called out honestly: a brand that
 * is present but different from the expected one reads as absent (→ "missing")
 * rather than "wrong", and a fanciful class/type designation that matches no
 * legal core term reads as absent rather than a `guess`. Both still fail; only
 * the reason differs.
 */
export function extractFields(text: string, type: DrinkType, lookFor: ThingsToLookFor): FieldRead[] {
  return [
    brandRead(text, lookFor),
    nameAddressRead(text, lookFor),
    warningRead(text, lookFor),
    alcoholRead(text),
    netContentsRead(text),
    classTypeRead(text, lookFor),
    countryRead(text)
  ];
}

function brandRead(text: string, lookFor: ThingsToLookFor): FieldRead {
  if (lookFor.brand && containsSubsequence(text, lookFor.brand)) {
    return {field: "brand", state: "found", text: lookFor.brand, basis: "confirmed"};
  }
  return {field: "brand", state: "absent"};
}

function nameAddressRead(text: string, lookFor: ThingsToLookFor): FieldRead {
  if (lookFor.nameAndAddress && containsSubsequence(text, lookFor.nameAndAddress)) {
    return {field: "name-and-address", state: "found", text: lookFor.nameAndAddress, basis: "confirmed"};
  }
  return {field: "name-and-address", state: "absent"};
}

/**
 * From the "GOVERNMENT WARNING" heading, keep the run of lines that belong to
 * the warning and stop at the first that doesn't — so text OCR happens to place
 * after the warning in its reading order (a net-contents or alcohol line printed
 * elsewhere on the label) isn't captured as part of it. A line belongs while
 * most of its words are words of the known warning; the volume/alcohol lines
 * share almost none, so they end the run. Capitalization is kept for the caps
 * check; the judge anchors the required wording within what remains.
 */
function warningRead(text: string, lookFor: ThingsToLookFor): FieldRead {
  if (!lookFor.warning) {
    return {field: "warning", state: "absent"};
  }
  const allLines = text.split(/\r?\n/);
  const start = allLines.findIndex((line) => line.toLowerCase().includes("government warning"));
  if (start < 0) {
    return {field: "warning", state: "absent"};
  }
  const warningWords = new Set(words(lookFor.warning.text));
  const kept: string[] = [allLines[start]];
  for (let i = start + 1; i < allLines.length; i++) {
    const lineWords = words(allLines[i]);
    if (lineWords.length === 0) {
      continue;
    }
    const overlap = lineWords.filter((word) => warningWords.has(word)).length / lineWords.length;
    if (overlap < 0.5) {
      break;
    }
    kept.push(allLines[i]);
  }
  return {field: "warning", state: "found", text: kept.join("\n").trim(), basis: "confirmed"};
}

/**
 * A properly-shaped alcohol statement, in either word order — "45% Alc./Vol.",
 * "Alc. 13.5% by Vol.", "13.5% Alcohol by Volume", "13% ABV" — or a proof
 * statement. A line qualifies when it carries both a percentage and an alcohol
 * word (order doesn't matter), or a proof figure.
 */
function alcoholRead(text: string): FieldRead {
  const line = lines(text).find(
    (candidate) => (PERCENT.test(candidate) && ALCOHOL_WORD.test(candidate)) || PROOF.test(candidate)
  );
  if (line) {
    return {field: "alcohol", state: "found", text: line, basis: "confirmed"};
  }
  return {field: "alcohol", state: "absent"};
}

/** A properly-shaped net-contents statement — a volume with a unit. */
function netContentsRead(text: string): FieldRead {
  const line = lineMatching(text, VOLUME);
  if (line) {
    return {field: "net-contents", state: "found", text: line, basis: "confirmed"};
  }
  return {field: "net-contents", state: "absent"};
}

/**
 * The class/type designation, anchored to the legal list: a line carrying a
 * legal core term (e.g. "bourbon") is a confirmed designation. The judge
 * re-checks against the list itself, so this only needs to surface the phrase.
 */
function classTypeRead(text: string, lookFor: ThingsToLookFor): FieldRead {
  for (const line of lines(text)) {
    if (matchesDesignation(line, lookFor.designations)) {
      return {field: "class-type", state: "found", text: line, basis: "confirmed"};
    }
  }
  return {field: "class-type", state: "absent"};
}

/** A country-of-origin statement — recognized on its own, so a guess. */
function countryRead(text: string): FieldRead {
  const line = lineMatching(text, /\b(?:product of|produce of|produced in|distilled in|imported by|imported from)\b/i);
  if (line) {
    return {field: "country-of-origin", state: "found", text: line, basis: "guess"};
  }
  return {field: "country-of-origin", state: "absent"};
}

// --- helpers --------------------------------------------------------------

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** The first non-empty line matching the pattern, trimmed; undefined if none. */
function lineMatching(text: string, pattern: RegExp): string | undefined {
  return lines(text).find((line) => pattern.test(line));
}
