import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppConfigService } from "../config/app-config.service";
import { Application } from "./application.entity";
import { ApplicationStore } from "./application.store";
import { ApplicationLoader } from "./application-loader";
import { CreateApplications1730000000000 } from "./migrations/1730000000000-create-applications";
import { DiskImageStore } from "./image-store/disk.image-store";
import { GcsImageStore } from "./image-store/gcs.image-store";
import { IMAGE_STORE, ImageStore } from "./image-store/image-store";

/**
 * Wires storage for the running app: the Postgres connection (from config, via
 * migrations — never schema auto-sync), the application repository, and the
 * config-chosen image store. Exports the store, loader, and image store for the
 * endpoints to come. Nothing here is imported by the pure core.
 *
 * Not yet imported by AppModule — there is no consumer until the endpoint phase,
 * and importing it would make the app require a database at boot.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: "postgres" as const,
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        username: config.database.user,
        password: config.database.password,
        entities: [Application],
        migrations: [CreateApplications1730000000000],
        migrationsRun: true,
        synchronize: false
      })
    }),
    TypeOrmModule.forFeature([Application])
  ],
  providers: [
    ApplicationStore,
    ApplicationLoader,
    {
      provide: IMAGE_STORE,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): ImageStore =>
        config.storage.imageStore === "gcs" ? new GcsImageStore(config.storage.bucket) : new DiskImageStore(config.storage.dir)
    }
  ],
  exports: [ApplicationStore, ApplicationLoader, IMAGE_STORE]
})
export class StorageModule {}
