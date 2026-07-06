export type DrinkType = "wine" | "distilled-spirits" | "malt-beverage";
export type OriginStatus = "imported" | "domestic";
export type Outcome = "pass" | "fail";

export interface Reason {
  id: string;
  labels: string[];
  expected?: string;
  found?: string;
  values?: { label: string; value: string }[];
}

export interface CheckResult {
  application: string;
  outcome: Outcome;
  reasons: Reason[];
  ranAt: string;
  tookMs: number;
  model: string;
  /** Whether the model fallback assisted the OCR pass (drives "OCR" vs "OCR + Model"). */
  assisted: boolean;
}

export interface ImageRef {
  label: string;
  ref: string;
}

export interface ApplicationSummary {
  id: string;
  drinkType: DrinkType;
  brand: string;
  importedOrDomestic: OriginStatus;
  outcome: Outcome | null;
  ranAt: string | null;
}

export interface ApplicationView {
  id: string;
  drinkType: DrinkType;
  brand: string;
  nameAndAddress: string;
  importedOrDomestic: OriginStatus;
  status: string;
  images: ImageRef[];
  result: CheckResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDetailsInput {
  drinkType: DrinkType;
  brand: string;
  nameAndAddress: string;
  importedOrDomestic: OriginStatus;
}

export interface ImageUpload {
  label: string;
  /** Base64-encoded image bytes. */
  data: string;
  mediaType: string;
}
