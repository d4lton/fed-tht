import { Inject, Module, OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import { AppConfigService } from "../config/app-config.service";
import { DatabaseHealthService } from "./database-health.service";
import { PG_POOL } from "./database.constants";

/**
 * Owns the Postgres connection at the outer edge of the app. The pure core
 * never sees it. For Phase 3 this is only a connection pool plus a reachability
 * check; real persistence arrives with the storage phase.
 *
 * The pool is created lazily by pg — building it does not open a socket — so the
 * app still boots when the database is down, and `/health` reports it
 * unreachable rather than the process failing to start.
 */
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): Pool => {
        const db = config.database;
        return new Pool({
          host: db.host,
          port: db.port,
          database: db.name,
          user: db.user,
          password: db.password,
          max: 4,
          // Keep the health check snappy when the database is unreachable.
          connectionTimeoutMillis: 1000,
          idleTimeoutMillis: 10000
        });
      }
    },
    DatabaseHealthService
  ],
  exports: [DatabaseHealthService]
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
