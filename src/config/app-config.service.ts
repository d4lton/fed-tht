import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppConfig, DatabaseConfig, ReaderConfig, StorageConfig } from "./config.schema";
import { APP_CONFIG_NAMESPACE } from "./configuration";

/**
 * The one way the rest of the app reads runtime settings. It hides where the
 * values came from (local file / test file / GCP) — callers just ask for a
 * setting. Swapping the source is invisible past this seam.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  private get app(): AppConfig {
    // getOrThrow so a programming error (namespace not loaded) fails loudly.
    return this.config.getOrThrow<AppConfig>(APP_CONFIG_NAMESPACE);
  }

  get env(): AppConfig["env"] {
    return this.app.env;
  }

  get port(): number {
    return this.app.port;
  }

  get serviceName(): string {
    return this.app.serviceName;
  }

  get database(): DatabaseConfig {
    return this.app.database;
  }

  get reader(): ReaderConfig {
    return this.app.reader;
  }

  get storage(): StorageConfig {
    return this.app.storage;
  }
}
