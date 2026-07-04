import {createAnthropic} from "@ai-sdk/anthropic";
import {generateObject, type LanguageModel} from "ai";
import {z} from "zod";
import {CanonicalField, DrinkType, FieldRead, LabelReadingReport} from "../core";
import {ClaudeLabelReader} from "./claude.reader";
import {LabelImage, LabelReader, ThingsToLookFor} from "./label-reader";

/**
 * The deterministic-first fallback. When the fast OCR path would fail a label,
 * it hands the hard part to a model — rarely, and dormant unless a key is
 * configured (see {@link createLlmFallback}). Two moves, both of which can only
 * turn a failing field into a passing one (never the reverse), so neither can
 * make a passing label fail:
 *
 * - `recheck` — a **required field the OCR text has but the parser missed** (an
 *   unusual unit, a split producer line). Re-examines the *text only* (no image)
 *   — cheap, since the text is already in hand.
 * - `reread` — a **field the OCR read too poorly to judge** (a sideways or
 *   low-quality government warning). Re-reads the *image* with a vision model,
 *   which handles rotation and poor print far better than flat OCR.
 */
export interface LlmFallback {
  recheck(input: RecheckInput): Promise<FieldRead[]>;
  reread(input: RereadInput): Promise<FieldRead[]>;
}

export interface RecheckInput {
  /** The combined OCR text across all of the application's labels. */
  text: string;
  /** The required fields that came up missing — the only ones to re-examine. */
  fields: CanonicalField[];
  type: DrinkType;
  lookFor: ThingsToLookFor;
  /** How long the whole validation has left; the call is abandoned past it. */
  deadlineMs: number;
}

export interface RereadInput {
  /** The label images to re-read with a vision model. */
  images: LabelImage[];
  /** The required fields the OCR read too poorly to judge (e.g. the warning). */
  fields: CanonicalField[];
  type: DrinkType;
  lookFor: ThingsToLookFor;
  /** How long the whole validation has left; the call is abandoned past it. */
  deadlineMs: number;
}

/** DI token for the configured {@link LlmFallback}. */
export const LLM_FALLBACK = Symbol("LLM_FALLBACK");

const ALL_FIELDS: [CanonicalField, ...CanonicalField[]] = [
  "brand",
  "name-and-address",
  "warning",
  "alcohol",
  "net-contents",
  "class-type",
  "country-of-origin"
];

const recheckSchema = z.object({
  fields: z.array(
    z.object({
      field: z.enum(ALL_FIELDS),
      state: z.enum(["found", "absent"]),
      text: z.string().optional(),
      basis: z.enum(["confirmed", "guess"]).optional()
    })
  )
});

const SYSTEM_PROMPT = [
  "You confirm whether specific fields appear in text an OCR reader pulled off a",
  "U.S. TTB beverage-alcohol label. Report ONLY what the text shows — never decide",
  "whether the label passes or fails. Do not invent fields that are not there.",
  "",
  "For 'brand' and 'name-and-address', mark found only when the expected value's",
  "words are all present (in order, though they may be split apart on the label),",
  "and return the expected value as the text. For the other fields, return the",
  "exact text you see. Set basis 'confirmed' when it matches a known/expected value",
  "or is a properly-shaped statement, 'guess' otherwise."
].join("\n");

/** The real fallback: text-only re-extraction and vision re-reading via the AI SDK. */
export class AiSdkFallback implements LlmFallback {

  constructor(
    private readonly languageModel: LanguageModel,
    private readonly visionReader: LabelReader
  ) {}

  async recheck(input: RecheckInput): Promise<FieldRead[]> {
    const wanted = new Set(input.fields);
    try {
      const {object} = await generateObject({
        model: this.languageModel,
        schema: recheckSchema,
        abortSignal: AbortSignal.timeout(input.deadlineMs),
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(input)
      });
      return object.fields
        .filter((entry) => entry.state === "found" && wanted.has(entry.field))
        .map((entry) => ({field: entry.field, state: "found" as const, text: entry.text, basis: entry.basis}));
    } catch {
      // A timeout or any model error just means no rescue — keep the
      // deterministic result rather than failing the whole validation.
      return [];
    }
  }

  async reread(input: RereadInput): Promise<FieldRead[]> {
    const wanted = new Set(input.fields);
    try {
      const reports = await withDeadline(
        Promise.all(input.images.map((image) => this.readOne(image, input))),
        input.deadlineMs
      );
      // Only the fields we asked about, and only where the re-read found them.
      return reports.flatMap((report) => report.fields).filter((read) => read.state === "found" && wanted.has(read.field));
    } catch {
      return [];
    }
  }

  private readOne(image: LabelImage, input: RereadInput): Promise<LabelReadingReport> {
    return this.visionReader
      .read(image, input.type, input.lookFor)
      .catch(() => ({label: image.label, fields: [] as FieldRead[]}));
  }

}

/** The dormant fallback used when no model key is configured — never rescues. */
export class NoopFallback implements LlmFallback {

  recheck(): Promise<FieldRead[]> {
    return Promise.resolve([]);
  }

  reread(): Promise<FieldRead[]> {
    return Promise.resolve([]);
  }

}

/**
 * Build the fallback from config. With no API key it is a no-op, so the fast
 * deterministic path is the whole story unless a key is deliberately supplied.
 * The base URL is pinned so a stray `ANTHROPIC_BASE_URL` in the environment
 * cannot redirect the call.
 */
export function createLlmFallback(config: {apiKey: string; model: string; timeoutMs: number}): LlmFallback {
  if (!config.apiKey) {
    return new NoopFallback();
  }
  const anthropic = createAnthropic({apiKey: config.apiKey, baseURL: "https://api.anthropic.com/v1"});
  const model = anthropic(config.model);
  const visionReader = new ClaudeLabelReader(model, config.timeoutMs, config.model);
  return new AiSdkFallback(model, visionReader);
}

/** Reject if the work isn't done within `ms`; the loser keeps running but is ignored. */
function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_resolve, reject) => setTimeout(() => reject(new Error("deadline")), ms))
  ]);
}

function buildPrompt(input: RecheckInput): string {
  const designations = input.lookFor.designations.map((designation) => designation.designation).join(", ") || "(none)";
  return [
    `This is OCR text from a ${input.type} label.`,
    `Confirm only these fields: ${input.fields.join(", ")}.`,
    "",
    "Context to anchor against:",
    `- Expected brand: "${input.lookFor.brand}"`,
    `- Expected name and address: "${input.lookFor.nameAndAddress}"`,
    `- Government warning wording: "${input.lookFor.warning?.text ?? "(not provided)"}"`,
    `- Legal class/type designations: ${designations}`,
    "",
    "OCR text:",
    input.text
  ].join("\n");
}
