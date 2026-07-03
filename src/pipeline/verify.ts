import {
  aggregate,
  DrinkType,
  ExpectedValues,
  judge,
  RulesForType,
  ValidationResult,
} from '../core';
import { LabelImage, LabelReader, ThingsToLookFor } from '../reader';

/**
 * The verification flow (verification pipeline steps 2–4): read each image
 * through the reader slot, combine the reads across labels, and judge — one
 * result for the whole set.
 *
 * The reader is passed in, so swapping it (stand-in now, a real photo-reader
 * later) is all that changes; combine and judge are the Phase 2 core, untouched.
 * The expected values are handed in directly for now; loading them from a stored
 * application is a later phase.
 */
export interface VerifyInput {
  images: LabelImage[];
  type: DrinkType;
  expected: ExpectedValues;
  rules: RulesForType;
  reader: LabelReader;
  /** Attached to the result if supplied. */
  application?: string;
}

export async function verifyLabels(
  input: VerifyInput,
): Promise<ValidationResult> {
  const lookFor = thingsToLookFor(input.expected, input.rules);

  // Extraction is per-image and independent, so the reads can run in parallel.
  const reports = await Promise.all(
    input.images.map((image) => input.reader.read(image, input.type, lookFor)),
  );

  const aggregated = aggregate(reports);
  return judge({
    aggregated,
    expected: input.expected,
    rules: input.rules,
    application: input.application,
  });
}

/**
 * Assemble the anchors a reader confirms against: the expected brand and
 * name/address (from the application) plus the fixed warning wording and the
 * legal designations (pulled from the rules loaded in Phase 2).
 */
export function thingsToLookFor(
  expected: ExpectedValues,
  rules: RulesForType,
): ThingsToLookFor {
  const warning = rules.fields.find((f) => f.find === 'fixed_text')?.fixedText;
  const designations =
    rules.fields.find((f) => f.find === 'from_list')?.designations ?? [];

  return {
    brand: expected.brand,
    nameAndAddress: expected.nameAndAddress,
    warning,
    designations,
  };
}
