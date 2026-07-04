import {readFileSync} from "fs";
import {ImageAnnotatorClient} from "@google-cloud/vision";
import {DrinkType, LabelReadingReport} from "../../core";
import {ReaderError} from "../claude.reader";
import {LabelImage, LabelReader, ThingsToLookFor} from "../label-reader";
import {extractFields} from "./extract";

/**
 * The fast reader: it reads a label with Google Cloud Vision's OCR and turns the
 * text into the label-report shape in plain code ({@link extractFields}). It
 * fills the same reader slot as the model reader, so combine and judge — and
 * everything downstream — are unchanged.
 *
 * Why OCR rather than a model: the whole validation has a hard latency budget,
 * and an OCR call is fast and low-variance where a model call is neither. Vision
 * authenticates with Application Default Credentials (a service account in
 * production, `gcloud auth application-default login` locally) — no API key.
 *
 * The reader still only describes; every pass/fail decision stays in the judge.
 */
export class VisionLabelReader implements LabelReader {

  readonly model = "google-vision";

  constructor(
    private readonly client: ImageAnnotatorClient,
    private readonly timeoutMs: number
  ) {}

  async read(image: LabelImage, type: DrinkType, lookFor: ThingsToLookFor): Promise<LabelReadingReport> {
    try {
      const content = Buffer.from(loadImageBytes(image));
      const [result] = await withTimeout(this.client.documentTextDetection({image: {content}}), this.timeoutMs);
      if (result.error?.message) {
        throw new Error(result.error.message);
      }
      const text = result.fullTextAnnotation?.text ?? "";
      return {label: image.label, fields: extractFields(text, type, lookFor), sourceText: text};
    } catch (error) {
      // A timeout, a network error, or an OCR failure all surface here as one
      // clear failure — never a hang or a made-up answer.
      throw new ReaderError(`reading label "${image.label}" failed: ${describeError(error)}`, error);
    }
  }

}

/** Build a Vision reader from config. Credentials come from ADC, never config. */
export function createVisionReader(config: {timeoutMs: number}): VisionLabelReader {
  return new VisionLabelReader(new ImageAnnotatorClient(), config.timeoutMs);
}

/** Fail the read cleanly on a slow OCR call rather than letting it hang. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`OCR timed out after ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    );
  });
}

function loadImageBytes(image: LabelImage): Uint8Array {
  // Prefer bytes handed in by the storage load step over reading a file.
  if (image.data) {
    return image.data;
  }
  if (!image.source) {
    throw new Error(`label "${image.label}" has no image bytes or source to read`);
  }
  return readFileSync(image.source);
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
