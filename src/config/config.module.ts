import {Global, Module} from "@nestjs/common";
import {ConfigModule} from "@nestjs/config";
import {AppConfigService} from "./app-config.service";
import {loadConfiguration} from "./configuration";

/**
 * Wires NestJS's own config module to our per-environment loader and exposes
 * the typed {@link AppConfigService}. Global so any module can inject the
 * config service without re-importing.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [loadConfiguration]
    })
  ],
  providers: [AppConfigService],
  exports: [AppConfigService]
})
export class AppConfigModule {}
