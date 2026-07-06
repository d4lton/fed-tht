import {Inject, Injectable} from "@nestjs/common";
import {DrinkType, ExpectedValues, OriginStatus} from "../core";
import {verifyLabels} from "../pipeline/verify";
import {LABEL_READER, LabelImage, LabelReader, LLM_FALLBACK, LlmFallback} from "../reader";
import {RulesProvider} from "../rules/rules.provider";
import {IMAGE_STORE, ImageStore} from "../storage/image-store/image-store";
import {CheckResult} from "./check-result";
import {ChecksLogStore} from "./checks-log.store";

/**
 * The whole validation's time budget. The fast OCR path finishes far inside it;
 * it exists to bound the deterministic-first fallback so a would-be failure that
 * hands off to the model can't blow past it.
 */
const VALIDATION_BUDGET_MS = 5000;

/** What the checker needs about an application to run a check on it. */
export interface CheckInput {
  application: string;
  type: DrinkType;
  brand: string;
  nameAndAddress: string;
  importedOrDomestic: OriginStatus;
  images: { label: string; ref: string }[];
}

/**
 * Runs and times a check, and records it. This is the outer layer around the
 * pure pipeline (read → combine → judge): it resolves the image references to
 * bytes through the storage swap point, runs the flow, stamps the run facts
 * (when, how long, which model, whether the model fallback assisted), and
 * appends one entry to the log. The core
 * still knows nothing of timing, models, or storage.
 */
@Injectable()
export class CheckService {

  constructor(
    @Inject(LABEL_READER) private readonly reader: LabelReader,
    @Inject(IMAGE_STORE) private readonly imageStore: ImageStore,
    @Inject(LLM_FALLBACK) private readonly fallback: LlmFallback,
    private readonly rules: RulesProvider,
    private readonly log: ChecksLogStore
  ) {}

  async run(input: CheckInput): Promise<CheckResult> {
    const images: LabelImage[] = await Promise.all(
      input.images.map(async ({label, ref}) => {
        const stored = await this.imageStore.load(ref);
        return {label, data: stored.bytes, mediaType: stored.mediaType};
      })
    );
    const expected: ExpectedValues = {
      brand: input.brand,
      nameAndAddress: input.nameAndAddress,
      importedOrDomestic: input.importedOrDomestic
    };
    const start = Date.now();
    const verdict = await verifyLabels({
      images,
      type: input.type,
      expected,
      rules: this.rules.forType(input.type),
      reader: this.reader,
      application: input.application,
      fallback: this.fallback,
      budgetMs: VALIDATION_BUDGET_MS
    });
    const tookMs = Date.now() - start;
    const result: CheckResult = {
      application: input.application,
      outcome: verdict.outcome,
      reasons: verdict.reasons,
      ranAt: new Date().toISOString(),
      tookMs,
      model: this.reader.model,
      assisted: verdict.assisted
    };
    await this.log.append(result);
    return result;
  }

}
