/**
 * The in-memory rules the judge reads. This is declarative *data* — it
 * describes fields, it does not compute. Per the Configuration-as-declarative-data
 * decision, each field carries three facets: shape, obligation, and find-strategy.
 * It never encodes where a field sits on the label — that is the reader's job.
 *
 * The core takes these rules as ordinary data. The YAML file and its loader
 * (a thin adapter under `src/rules`) are what produce this shape; the core's own
 * tests build it directly, with no file reading.
 */

import { CanonicalField, DrinkType } from './reads';

/** Find-strategy: how a field is located and anchored. */
export type FindStrategy =
  | 'from_expected' // anchor to an application value (brand; name and address)
  | 'fixed_text' // anchor to a known legal string (the warning)
  | 'from_list' // anchor to a compiled list of allowed values (class/type designations)
  | 'by_format' // find by distinctive shape (alcohol, net contents), presence only
  | 'none'; // open-ended recognition, nothing to match against

/** How lenient an anchored comparison is. */
export type MatchLeniency =
  | 'lenient' // ignore case and punctuation (brand)
  | 'loose'; // allow surrounding/wrapping words too (name and address)

/** The distinctive shape a by-format presence check looks for. */
export type FormatKind = 'alcohol' | 'net-contents' | 'country-of-origin';

/** Where the answer to a condition comes from. */
export type ConditionSource = 'label' | 'application' | 'unavailable';

/** A flat, non-composing condition tag with a declared source for its answer. */
export interface Condition {
  tag: string;
  source: ConditionSource;
}

/** When a field is required. */
export interface Obligation {
  /** Base requiredness. */
  required: boolean;
  /** When present, the field is required only if this condition holds. */
  condition?: Condition;
}

/** A fixed legal string a field anchors to (the government warning). */
export interface FixedText {
  id: string;
  text: string;
  /** Words that must appear in capital letters, e.g. "GOVERNMENT WARNING". */
  capsWords: string[];
}

/** One legal designation and the core terms the check looks for inside a phrase. */
export interface Designation {
  designation: string;
  coreTerms: string[];
}

/** The reason IDs a field can emit. Keys are outcomes; values are the ID strings. */
export type ReasonKey =
  | 'missing'
  | 'wrong'
  | 'caps'
  | 'invalid'
  | 'unconfirmed'
  | 'unreadable'
  | 'conflict';

export interface FieldRule {
  /** Shape: the canonical field this rule is about. */
  field: CanonicalField;
  /** Find-strategy. */
  find: FindStrategy;
  /** Comparison leniency, for anchored `from_expected` fields. */
  match?: MatchLeniency;
  /** The shape a `by_format` field looks for. */
  format?: FormatKind;
  /** Resolved fixed text, for `fixed_text` fields. */
  fixedText?: FixedText;
  /** Resolved designation list, for `from_list` fields. */
  designations?: Designation[];
  /** Obligation: when the field is required. */
  obligation: Obligation;
  /** The reason IDs this field emits, keyed by outcome. */
  reasons: Partial<Record<ReasonKey, string>>;
}

export interface RulesForType {
  type: DrinkType;
  fields: FieldRule[];
}
