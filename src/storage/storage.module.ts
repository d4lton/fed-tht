import {Module} from "@nestjs/common";
import {TypeOrmModule, TypeOrmModuleOptions} from "@nestjs/typeorm";
import {AppConfigService} from "../config/app-config.service";
import {CheckRun} from "../checks/check-run.entity";
import {Application} from "./application.entity";
import {ApplicationStore} from "./application.store";
import {ApplicationLoader} from "./application-loader";
import {CreateApplications1730000000000} from "./migrations/1730000000000-create-applications";
import {CreateCheckRuns1730000001000} from "./migrations/1730000001000-create-check-runs";
import {DiskImageStore} from "./image-store/disk.image-store";
import {GcsImageStore} from "./image-store/gcs.image-store";
import {IMAGE_STORE, ImageStore} from "./image-store/image-store";

const ENTITIES = [Application, CheckRun];

/**
 * Wires storage for the running app: the database connection (from config), the
 * repositories, and the config-chosen image store. Nothing here is imported by
 * the pure core.
 *
 * The database is Postgres in the real app — created and kept up to date via
 * migrations, never schema auto-sync. Under test it is a lightweight in-memory
 * database (auto-synced), so the app boots and the endpoints run without a live
 * Postgres.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): TypeOrmModuleOptions => {
        if (config.env === "test") {
          return {
            type: "sqljs",
            autoSave: false,
            entities: ENTITIES,
            synchronize: true
          };
        }
        const db = config.database;
        return {
          type: "postgres",
          host: db.host,
          port: db.port,
          database: db.name,
          username: db.user,
          password: db.password,
          entities: ENTITIES,
          migrations: [CreateApplications1730000000000, CreateCheckRuns1730000001000],
          migrationsRun: true,
          synchronize: false
        };
      }
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
