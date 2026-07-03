import {Module, ValidationPipe} from "@nestjs/common";
import {APP_FILTER, APP_PIPE} from "@nestjs/core";
import {ApplicationNotFoundFilter} from "./applications/application-not-found.filter";
import {ApplicationsModule} from "./applications/applications.module";
import {ChecksModule} from "./checks/checks.module";
import {AppConfigModule} from "./config/config.module";
import {HealthModule} from "./health/health.module";
import {ReaderModule} from "./reader/reader.module";
import {RulesModule} from "./rules/rules.module";
import {StorageModule} from "./storage/storage.module";

@Module({
  imports: [AppConfigModule, StorageModule, ReaderModule, RulesModule, ChecksModule, ApplicationsModule, HealthModule],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({whitelist: true, transform: true})
    },
    {provide: APP_FILTER, useClass: ApplicationNotFoundFilter}
  ]
})
export class AppModule {}
