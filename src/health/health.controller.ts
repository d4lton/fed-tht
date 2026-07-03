import { Controller, Get } from "@nestjs/common";
import { AppConfigService } from "../config/app-config.service";
import { DatabaseHealth, DatabaseHealthService } from "../database/database-health.service";

export interface HealthResponse {
  status: "ok";
  service: string;
  env: string;
  /** Whether the app can currently reach the database. */
  database: DatabaseHealth;
}

/**
 * Thin endpoint: proves the service is up, which env it booted in, and whether
 * it can reach the database. `status` is app liveness (the process is serving);
 * database reachability is reported separately so it can be false without
 * claiming the process itself is down.
 */
@Controller("health")
export class HealthController {
  constructor(
    private readonly config: AppConfigService,
    private readonly databaseHealth: DatabaseHealthService
  ) {}

  @Get()
  async check(): Promise<HealthResponse> {
    return {
      status: "ok",
      service: this.config.serviceName,
      env: this.config.env,
      database: await this.databaseHealth.check()
    };
  }
}
