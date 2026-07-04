import {Module} from "@nestjs/common";
import {AppConfigService} from "../config/app-config.service";
import {createClaudeReader} from "./claude.reader";
import {LABEL_READER, LabelReader} from "./label-reader";
import {createLlmFallback, LLM_FALLBACK, LlmFallback} from "./llm-fallback";
import {createVisionReader} from "./vision/vision.reader";

/**
 * Provides the configured label reader behind the {@link LABEL_READER} slot, so
 * anything that runs a check depends only on the interface. Which reader fills
 * the slot is a config choice (`reader.provider`) — the fast OCR reader (Google
 * Vision) or the model reader (Claude) — and tests bind a stand-in to the same
 * token. Swapping the reader changes nothing downstream.
 *
 * It also provides the deterministic-first {@link LLM_FALLBACK}, dormant unless a
 * model key is configured — so the fast OCR path can hand off a would-be failure
 * to a model without either one depending on the other.
 */
@Module({
  providers: [
    {
      provide: LABEL_READER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): LabelReader =>
        config.reader.provider === "google-vision"
          ? createVisionReader(config.reader)
          : createClaudeReader(config.reader)
    },
    {
      provide: LLM_FALLBACK,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): LlmFallback => createLlmFallback(config.reader)
    }
  ],
  exports: [LABEL_READER, LLM_FALLBACK]
})
export class ReaderModule {}
