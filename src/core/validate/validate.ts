import {
  AggregatedField,
  AggregatedInfo,
  FieldObservation,
} from '../aggregate/aggregate';
import { matchesDesignation } from '../designations/match';
import { containsPhrase, normalizedText } from '../text/normalize';
import { checkWarning } from '../warning/warning';
import {
  Condition,
  ExpectedValues,
  FieldRule,
  Outcome,
  Reason,
  RulesForType,
  ValidationResult,
} from '../types';

/**
 * Judge (pipeline step 4): the pure, deterministic compliance decision. Takes
 * the combined view, the expected values, and the rules-as-data, and returns a
 * result — a pass, or a fail with reasons. Every compliance verdict lives here
 * and nowhere else. It reaches into nothing: no images, no storage, no HTTP, no
 * framework — everything it needs arrives as arguments.
 */
export interface JudgeInput {
  aggregated: AggregatedInfo;
  expected: ExpectedValues;
  rules: RulesForType;
  /** Attached to the result if supplied; the core never invents one. */
  application?: string;
}

export function judge(input: JudgeInput): ValidationResult {
  const { aggregated, expected, rules, application } = input;
  const reasons: Reason[] = [];

  for (const rule of rules.fields) {
    // A rule that doesn't apply to this product leaves no trace — not a pass,
    // not a fail, not a note.
    if (!isRequired(rule, expected)) {
      continue;
    }

    const agg = aggregated.byField[rule.field];

    // Labels agreeing: the same field showing different values on two labels is
    // a fail, regardless of whether any single value is otherwise correct.
    const conflict = detectConflict(rule, agg);
    if (conflict) {
      reasons.push(conflict);
    }

    reasons.push(...judgeField(rule, agg, expected));
  }

  const outcome: Outcome = reasons.length > 0 ? 'fail' : 'pass';
  return application !== undefined
    ? { application, outcome, reasons }
    : { outcome, reasons };
}

// --- obligation -----------------------------------------------------------

function isRequired(rule: FieldRule, expected: ExpectedValues): boolean {
  const { obligation } = rule;
  if (!obligation.condition) {
    return obligation.required;
  }
  const holds = evalCondition(obligation.condition, expected);
  // If the condition's answer isn't available to us, there is no rule to apply.
  return holds ?? false;
}

function evalCondition(
  condition: Condition,
  expected: ExpectedValues,
): boolean | undefined {
  if (condition.source === 'application' && condition.tag === 'imported') {
    return expected.importedOrDomestic === 'imported';
  }
  return undefined;
}

// --- conflict detection ---------------------------------------------------

function detectConflict(
  rule: FieldRule,
  agg: AggregatedField | undefined,
): Reason | undefined {
  const conflictId = rule.reasons.conflict;
  if (!conflictId || !agg || agg.found.length < 2) {
    return undefined;
  }

  const groups: FieldObservation[][] = [];
  for (const observation of agg.found) {
    const group = groups.find((g) =>
      sameValue(rule, g[0].text ?? '', observation.text ?? ''),
    );
    if (group) {
      group.push(observation);
    } else {
      groups.push([observation]);
    }
  }

  if (groups.length < 2) {
    return undefined;
  }

  return {
    id: conflictId,
    labels: agg.found.map((o) => o.label),
    values: agg.found.map((o) => ({ label: o.label, value: o.text ?? '' })),
  };
}

/** Whether two found values count as "the same" for this field's leniency. */
function sameValue(rule: FieldRule, a: string, b: string): boolean {
  if (rule.match === 'loose') {
    // One wrapping the other (e.g. "Bottled by X, City, ST" vs "X, City, ST")
    // is not a disagreement.
    return (
      normalizedText(a) === normalizedText(b) ||
      containsPhrase(a, b) ||
      containsPhrase(b, a)
    );
  }
  return normalizedText(a) === normalizedText(b);
}

// --- per-field judging ----------------------------------------------------

function judgeField(
  rule: FieldRule,
  agg: AggregatedField | undefined,
  expected: ExpectedValues,
): Reason[] {
  switch (rule.find) {
    case 'from_expected':
      return judgeFromExpected(rule, agg, expected);
    case 'fixed_text':
      return judgeFixedText(rule, agg);
    case 'from_list':
      return judgeFromList(rule, agg);
    case 'by_format':
    case 'none':
      return judgePresence(rule, agg);
  }
}

function foundOf(agg: AggregatedField | undefined): FieldObservation[] {
  return agg?.found ?? [];
}

function labelsOf(observations: FieldObservation[]): string[] {
  return observations.map((o) => o.label);
}

/**
 * A required field with nothing found anywhere. If the only evidence was an
 * unreadable spot (and the rule names an `unreadable` reason), say so pointing
 * at that label; otherwise it is simply missing (not tied to any one label).
 */
function absenceReason(
  rule: FieldRule,
  agg: AggregatedField | undefined,
): Reason {
  const unreadableLabels = agg?.unreadableLabels ?? [];
  if (unreadableLabels.length > 0 && rule.reasons.unreadable) {
    return { id: rule.reasons.unreadable, labels: [...unreadableLabels] };
  }
  return { id: rule.reasons.missing ?? `${rule.field}-missing`, labels: [] };
}

function judgeFromExpected(
  rule: FieldRule,
  agg: AggregatedField | undefined,
  expected: ExpectedValues,
): Reason[] {
  const found = foundOf(agg);
  if (found.length === 0) {
    return [absenceReason(rule, agg)];
  }

  const expectedValue =
    rule.field === 'brand' ? expected.brand : expected.nameAndAddress;

  const anyMatch = found.some((o) =>
    matchesExpected(rule, o.text ?? '', expectedValue),
  );
  if (anyMatch) {
    return [];
  }

  const wrongId = rule.reasons.wrong;
  if (!wrongId) {
    return [];
  }
  return [
    {
      id: wrongId,
      labels: labelsOf(found),
      expected: expectedValue,
      found: found[0].text ?? '',
    },
  ];
}

/** Anchored comparison against an expected value. */
function matchesExpected(
  rule: FieldRule,
  text: string,
  expectedValue: string,
): boolean {
  if (rule.match === 'loose') {
    // The label wraps the producer in extra words; confirm it appears within.
    return (
      normalizedText(text) === normalizedText(expectedValue) ||
      containsPhrase(text, expectedValue)
    );
  }
  // lenient: ignore case and punctuation.
  return normalizedText(text) === normalizedText(expectedValue);
}

function judgeFixedText(
  rule: FieldRule,
  agg: AggregatedField | undefined,
): Reason[] {
  const found = foundOf(agg);
  if (found.length === 0) {
    return [absenceReason(rule, agg)];
  }

  const fixed = rule.fixedText;
  if (!fixed) {
    return [];
  }

  let sawWrongWords = false;
  let sawBadCaps = false;
  for (const observation of found) {
    const verdict = checkWarning(observation.text ?? '', fixed);
    if (verdict === 'ok') {
      // The correct warning on any one label satisfies the requirement.
      return [];
    }
    if (verdict === 'wrong-words') {
      sawWrongWords = true;
    } else {
      sawBadCaps = true;
    }
  }

  if (sawWrongWords && rule.reasons.wrong) {
    return [{ id: rule.reasons.wrong, labels: labelsOf(found) }];
  }
  if (sawBadCaps && rule.reasons.caps) {
    return [{ id: rule.reasons.caps, labels: labelsOf(found) }];
  }
  return [];
}

function judgeFromList(
  rule: FieldRule,
  agg: AggregatedField | undefined,
): Reason[] {
  const found = foundOf(agg);
  if (found.length === 0) {
    return [absenceReason(rule, agg)];
  }

  const designations = rule.designations ?? [];

  // Valid if any found phrase contains a legal core term — the judge confirms
  // against the list itself rather than trusting the reader's basis flag.
  if (found.some((o) => matchesDesignation(o.text ?? '', designations))) {
    return [];
  }

  // Not a legal designation. A read the reader admits it could not anchor
  // (basis = guess) is a specialty free-form name → unconfirmed. A read
  // presented as a designation that still isn't legal → invalid.
  const claimed = found.filter((o) => o.basis !== 'guess');
  if (claimed.length > 0 && rule.reasons.invalid) {
    return [
      {
        id: rule.reasons.invalid,
        labels: labelsOf(claimed),
        found: claimed[0].text ?? '',
      },
    ];
  }
  if (rule.reasons.unconfirmed) {
    return [
      {
        id: rule.reasons.unconfirmed,
        labels: labelsOf(found),
        found: found[0].text ?? '',
      },
    ];
  }
  return [];
}

/** Presence-only: a properly-formed statement present on any label satisfies it. */
function judgePresence(
  rule: FieldRule,
  agg: AggregatedField | undefined,
): Reason[] {
  if (foundOf(agg).length > 0) {
    return [];
  }
  return [absenceReason(rule, agg)];
}
