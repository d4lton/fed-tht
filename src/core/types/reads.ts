/**
 * The reader's report for a single label image — "what I saw," never a verdict.
 * The combine step stacks these across all of an application's labels; the judge
 * works from the combined view. See the Label Reading Report design page.
 */

/**
 * Which rule set applies. Mirrors the drink type stored on the application
 * record (wine / distilled spirits / malt beverage). Phase 2 implements the
 * distilled-spirits rules only.
 */
export type DrinkType = "wine" | "distilled-spirits" | "malt-beverage";

/**
 * The shared, canonical field vocabulary. All three rule facets and every read
 * key off these names so they cannot silently desynchronize.
 */
export type CanonicalField = "brand" | "name-and-address" | "warning" | "alcohol" | "net-contents" | "class-type" | "country-of-origin";

/** Three distinct states, kept separate end to end (never collapse unreadable into absent). */
export type FieldState = "found" | "absent" | "unreadable";

/**
 * How the reader knows what it read: `confirmed` = it matched something known
 * (the expected brand, the name/address on file, the fixed warning wording, a
 * legal designation from the compiled list, or a properly-shaped statement);
 * `guess` = it recognized this on its own with nothing to check against (mainly
 * a specialty product's free-form designation).
 */
export type Basis = "confirmed" | "guess";

/** One observation about one field on one label. */
export interface FieldRead {
  field: CanonicalField;
  state: FieldState;
  /** What was actually read, when something was found. */
  text?: string;
  /** Roughly where on the label, if the reader can say. The judge never needs it. */
  where?: string;
  /** How the reader knows what it read; present when found. */
  basis?: Basis;
}

/** One report per label image. */
export interface LabelReadingReport {
  /** Which label this is (its ID), so the combine step knows where each observation came from. */
  label: string;
  fields: FieldRead[];
  /** General observations not about one field ("the whole image is dark"). Optional. */
  notes?: string[];
  /**
   * The raw text the reader read off this label, when it has it (an OCR reader
   * does; a model reader may not). Not used by combine or judge — it is here so a
   * fallback pass can re-examine the same text without re-reading the image.
   */
  sourceText?: string;
}
