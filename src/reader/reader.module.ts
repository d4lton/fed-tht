import {Module} from "@nestjs/common";
import {AppConfigService} from "../config/app-config.service";
import {createClaudeReader} from "./claude.reader";
import {LABEL_READER} from "./label-reader";

/**
 * Provides the configured label reader behind the {@link LABEL_READER} slot, so
 * anything that runs a check depends only on the interface. Swapping the reader
 * (the real Claude reader, or a stand-in in tests) is a matter of binding a
 * different value to this token.
 */
@Module({
  providers: [
    {
      provide: LABEL_READER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => createClaudeReader(config.reader)
    }
  ],
  exports: [LABEL_READER]
})
export class ReaderModule {}
