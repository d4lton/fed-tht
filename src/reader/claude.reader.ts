import { readFileSync } from "fs";
import { extname } from "path";
import { generateObject, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { DrinkType, LabelReadingReport } from "../core";
import { LabelImage, LabelReader, ThingsToLookFor } from "./label-reader";
import { labelReportSchema, toLabelReadingReport } from "./label-report.schema";

/**
 * The real reader: it looks at an actual label image and produces the
 * label-report by asking Claude (through Vercel's AI SDK) to read the label. It
 * fills the same reader slot the stand-in filled, so combine and judge — and
 * everything else — stay exactly as they are.
 *
 * The model only describes what it sees; every pass/fail decision stays in our
 * code. The response is constrained to the fixed label-report shape, so a reply
 * that does not fit fails plainly. The provider (Claude) and model (a fast tier,
 * Haiku) are chosen through config, so the reader can be swapped.
 */
export class ClaudeLabelReader implements LabelReader {
  constructor(
    private readonly model: LanguageModel,
    private readonly timeoutMs: number
  ) {}

  async read(image: LabelImage, type: DrinkType, lookFor: ThingsToLookFor): Promise<LabelReadingReport> {
    try {
      const { bytes, mediaType } = loadImage(image);
      const { object } = await generateObject({
        model: this.model,
        schema: labelReportSchema,
        // Fail the read cleanly on a slow model rather than hanging.
        abortSignal: AbortSignal.timeout(this.timeoutMs),
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: buildUserPrompt(type, lookFor) },
              { type: "image", image: bytes, mediaType }
            ]
          }
        ]
      });
      return toLabelReadingReport(object, image.label);
    } catch (error) {
      // A timeout, a model/network error, or a response that doesn't fit the
      // shape all surface here as one clear failure — never a hang or a
      // made-up answer.
      throw new ReaderError(`reading label "${image.label}" failed: ${describeError(error)}`, error);
    }
  }
}

/** Build a Claude reader from config: the provider and model are config choices. */
export interface ClaudeReaderConfig {
  apiKey: string;
  /** The model id, e.g. `claude-haiku-4-5`. */
  model: string;
  timeoutMs: number;
}

export function createClaudeReader(config: ClaudeReaderConfig): ClaudeLabelReader {
  const anthropic = createAnthropic({ apiKey: config.apiKey });
  return new ClaudeLabelReader(anthropic(config.model), config.timeoutMs);
}

/** A reader failure — a clear error, not a hang or a wrong answer. */
export class ReaderError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "ReaderError";
  }
}

// --- prompt ---------------------------------------------------------------

const SYSTEM_PROMPT = [
  "You are a meticulous reader of U.S. TTB beverage-alcohol labels.",
  "Report ONLY what you observe on the image. Never decide whether the label",
  "passes or fails — that judgement is made elsewhere, not by you.",
  "",
  "For each field, give its state:",
  '- "found": the field is present (include the exact text you read, and',
  "  roughly where on the label it sits if that is easy to say).",
  '- "absent": the field is not on this label.',
  '- "unreadable": the area where it might be is too blurry or obscured to read.',
  "",
  'Set "basis" for a found field to "confirmed" when the text matches one of the',
  "known values you were given to look for (the expected brand, the expected",
  "name and address, the exact warning wording, or a legal class/type",
  'designation from the provided list). Set it to "guess" when you recognized',
  "something on your own with nothing to match it against — for example a",
  "specialty product's made-up or fanciful designation.",
  "",
  "Report only fields you can actually speak to; do not invent fields."
].join("\n");
const TYPE_NAMES: Record<DrinkType, string> = {
  "distilled-spirits": "distilled spirits",
  wine: "wine",
  "malt-beverage": "malt beverage"
};

function buildUserPrompt(type: DrinkType, lookFor: ThingsToLookFor): string {
  const designations = lookFor.designations.map((d) => d.designation).join(", ") || "(none)";
  return [
    `This is a ${TYPE_NAMES[type]} label.`,
    "Report these fields: brand, name-and-address, warning, alcohol,",
    "net-contents, class-type, country-of-origin.",
    "",
    "Things to look for — confirm whether each appears, and where:",
    `- Expected brand: "${lookFor.brand}"`,
    `- Expected name and address: "${lookFor.nameAndAddress}"`,
    `- Government warning (exact wording): "${lookFor.warning?.text ?? "(not provided)"}"`,
    `- Legal class/type designations to match against: ${designations}`
  ].join("\n");
}

// --- image loading --------------------------------------------------------

function loadImage(image: LabelImage): { bytes: Buffer; mediaType: string } {
  if (!image.source) {
    throw new Error(`label "${image.label}" has no image source to read`);
  }
  return {
    bytes: readFileSync(image.source),
    mediaType: mediaTypeFor(image.source)
  };
}

function mediaTypeFor(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return "the model timed out";
    }
    return error.message || error.name;
  }
  return String(error);
}
