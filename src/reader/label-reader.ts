import { Designation, DrinkType, FixedText, LabelReadingReport } from "../core";

/**
 * The reader slot — the shape any label reader must have. The reader is the one
 * part that talks to the outside world (real photos, later a photo-reading
 * model); everything downstream is plain logic. A real reader drops into this
 * same slot with nothing else changing.
 *
 * The reader only describes what it sees; it never decides pass or fail. See
 * "AI extracts, the algorithm judges".
 */
export interface LabelReader {
  /**
   * Read one image and report what is on it, given the things to look for.
   * Async because a real reader (a model) will be; the stand-in resolves
   * immediately. Called once per image.
   */
  read(image: LabelImage, type: DrinkType, lookFor: ThingsToLookFor): Promise<LabelReadingReport>;
}

/** One label image handed to the reader. */
export interface LabelImage {
  /** Which label this is (front/back/neck) — carried through to the report. */
  label: string;
  /**
   * Where the image bytes live. Opaque to the pipeline; only a real reader
   * interprets it. The stand-in ignores it.
   */
  source?: string;
}

/**
 * The anchors a reader is handed to confirm against (see "Anchored extraction"):
 * the expected brand and name/address (from the application), plus the fixed
 * warning wording and the legal designations for the drink type (from the
 * rules). A reader searches the whole image for these; placement is its job.
 */
export interface ThingsToLookFor {
  brand: string;
  nameAndAddress: string;
  warning?: FixedText;
  designations: Designation[];
}
