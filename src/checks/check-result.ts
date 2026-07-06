import {Outcome, Reason} from "../core";

/**
 * A result as it is stored and returned by the web layer: the pure verdict
 * (outcome + reasons from the core) plus a few plain facts about the run that
 * produced it. The core knows nothing of timing or models — the run facts are
 * attached by the outer layer that runs and times the check. See the Validation
 * Result design page.
 */
export interface CheckResult {
  application: string;
  outcome: Outcome;
  reasons: Reason[];
  /** When the check ran (ISO 8601). */
  ranAt: string;
  /** How long the whole check took, start to result. */
  tookMs: number;
  /** Which model/reader read the images. */
  model: string;
  /**
   * Whether the model fallback was consulted to rescue a field the fast OCR
   * pass couldn't. False for a plain OCR run; true when a model was in the loop
   * (and the reason the run took longer). The UI turns this into "OCR" vs
   * "OCR + Model" without exposing the reader or model names.
   */
  assisted: boolean;
}
