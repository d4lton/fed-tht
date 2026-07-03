/**
 * The verdict shape. Deliberately small: a pass with nothing to say, or a fail
 * with a list of reasons. The outcome is derived from the reasons (any reason →
 * fail), so the two can never disagree. See the Validation Result design page.
 *
 * The result carries IDs and facts, not sentences — turning `brand-wrong` into
 * readable text is the display side's job, not the core's.
 */

export type Outcome = 'pass' | 'fail';

/** The value one label showed, used when labels disagree. */
export interface ConflictValue {
  label: string;
  value: string;
}

export interface Reason {
  /** A single string naming the exact problem, e.g. `warning-missing` or `brand-wrong`. */
  id: string;
  /**
   * The labels the problem involves. Empty when it isn't tied to any one label
   * (a warning missing from every label); one or more when it is (a wrong brand
   * on one label, or two labels that disagree).
   */
  labels: string[];
  /** For a mismatch: what we expected. */
  expected?: string;
  /** For a mismatch: what we found. */
  found?: string;
  /** For a cross-label disagreement: the value each label showed. */
  values?: ConflictValue[];
}

export interface ValidationResult {
  /**
   * Which application was checked. Optional here because the pure core is not
   * handed an application ID; it is attached at the service boundary (later phase).
   */
  application?: string;
  outcome: Outcome;
  reasons: Reason[];
}
