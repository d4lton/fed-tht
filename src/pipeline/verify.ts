import {
  aggregate,
  CanonicalField,
  DrinkType,
  ExpectedValues,
  FieldRead,
  judge,
  LabelReadingReport,
  RulesForType,
  ValidationResult
} from "../core";
import {LabelImage, LabelReader, LlmFallback, ThingsToLookFor} from "../reader";

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
  /**
   * Deterministic-first fallback: consulted only when the fast pass would fail
   * for a missing required field. Omit to skip the fallback entirely.
   */
  fallback?: LlmFallback;
  /** Total time budget for the whole validation, used to bound the fallback. */
  budgetMs?: number;
}

/**
 * The pure verdict plus one run-fact the display needs: whether the model
 * fallback was consulted. `assisted` is true only when the deterministic-first
 * fallback actually rescued a field (a model was in the loop). The pure core
 * still returns only the verdict — this flag is added at the pipeline boundary.
 */
export interface VerifyResult extends ValidationResult {
  assisted: boolean;
}

export async function verifyLabels(input: VerifyInput): Promise<VerifyResult> {
  const started = Date.now();
  const lookFor = thingsToLookFor(input.expected, input.rules);
  // Extraction is per-image and independent, so the reads can run in parallel.
  const reports = await Promise.all(input.images.map((image) => input.reader.read(image, input.type, lookFor)));
  const result = judge({
    aggregated: aggregate(reports),
    expected: input.expected,
    rules: input.rules,
    application: input.application
  });
  if (result.outcome === "pass" || !input.fallback) {
    return {...result, assisted: false};
  }
  return rescue(result, reports, lookFor, input, Date.now() - started);
}

/**
 * On a would-be failure, hand the hard fields to the model fallback: the ones
 * the OCR text has but the parser missed (re-checked from text), and the ones
 * the OCR read too poorly to judge (re-read from the image). Whatever comes back
 * *replaces* the fast pass's read of that field and the set is re-judged. This
 * can only clear a field's failure, never introduce one, so it cannot turn a
 * pass into a fail.
 */
async function rescue(
  result: ValidationResult,
  reports: LabelReadingReport[],
  lookFor: ThingsToLookFor,
  input: VerifyInput,
  elapsedMs: number
): Promise<VerifyResult> {
  const fallback = input.fallback;
  const deadlineMs = (input.budgetMs ?? Infinity) - elapsedMs;
  const missing = fieldsWithReason(result, input.rules, (reasons) => reasons.missing);
  const unreadable = fieldsWithReason(result, input.rules, (reasons) => reasons.unreadable);
  // No hard fields to chase, or no time left to chase them.
  if (!fallback || (missing.length === 0 && unreadable.length === 0) || deadlineMs < 800) {
    return {...result, assisted: false};
  }

  // The two moves are independent, so run them at once — total time is the
  // slower of the two, not their sum, and each gets the full remaining budget.
  const text = reports.map((report) => report.sourceText).filter((source): source is string => Boolean(source)).join("\n");
  const [rechecked, reread] = await Promise.all([
    missing.length > 0 && text
      ? fallback.recheck({text, fields: missing, type: input.type, lookFor, deadlineMs})
      : Promise.resolve<FieldRead[]>([]),
    unreadable.length > 0
      ? fallback.reread({images: input.images, fields: unreadable, type: input.type, lookFor, deadlineMs})
      : Promise.resolve<FieldRead[]>([])
  ]);
  const rescued = [...rechecked, ...reread];
  if (rescued.length === 0) {
    return {...result, assisted: false};
  }

  // Replace the fast pass's read of each rescued field so the re-read supersedes
  // the poor one — adding it alongside would look like two labels disagreeing.
  const rescuedFields = new Set(rescued.map((read) => read.field));
  const trimmed = reports.map((report) => ({
    ...report,
    fields: report.fields.filter((read) => !rescuedFields.has(read.field))
  }));
  const rejudged = judge({
    aggregated: aggregate([...trimmed, {label: "fallback", fields: rescued}]),
    expected: input.expected,
    rules: input.rules,
    application: input.application
  });
  return {...rejudged, assisted: true};
}

/** Required fields whose named reason (missing / unreadable) the fast pass emitted. */
function fieldsWithReason(
  result: ValidationResult,
  rules: RulesForType,
  reasonId: (reasons: RulesForType["fields"][number]["reasons"]) => string | undefined
): CanonicalField[] {
  const reasonIds = new Set(result.reasons.map((reason) => reason.id));
  return rules.fields
    .filter((rule) => {
      const id = reasonId(rule.reasons);
      return id !== undefined && reasonIds.has(id);
    })
    .map((rule) => rule.field);
}

/**
 * Assemble the anchors a reader confirms against: the expected brand and
 * name/address (from the application) plus the fixed warning wording and the
 * legal designations (pulled from the rules loaded in Phase 2).
 */
export function thingsToLookFor(expected: ExpectedValues, rules: RulesForType): ThingsToLookFor {
  const warning = rules.fields.find((rule) => rule.find === "fixed_text")?.fixedText;
  const designations = rules.fields.find((rule) => rule.find === "from_list")?.designations ?? [];
  return {
    brand: expected.brand,
    nameAndAddress: expected.nameAndAddress,
    warning,
    designations
  };
}
