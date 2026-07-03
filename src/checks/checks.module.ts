import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {ReaderModule} from "../reader/reader.module";
import {RulesModule} from "../rules/rules.module";
import {StorageModule} from "../storage/storage.module";
import {CheckRun} from "./check-run.entity";
import {CheckService} from "./check.service";
import {ChecksLogStore} from "./checks-log.store";
import {ReasonTextsController} from "./reason-texts.controller";

/**
 * The check layer: runs and times validation, keeps the log of runs, and serves
 * the reason-text list. Depends on the storage swap point (for images), the
 * reader slot, and the rules — never on the pure core's internals.
 */
@Module({
  imports: [TypeOrmModule.forFeature([CheckRun]), StorageModule, ReaderModule, RulesModule],
  controllers: [ReasonTextsController],
  providers: [CheckService, ChecksLogStore],
  exports: [CheckService]
})
export class ChecksModule {}
