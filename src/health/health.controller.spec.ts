import { AppConfigService } from "../config/app-config.service";
import { DatabaseHealthService } from "../database/database-health.service";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  const config = {
    serviceName: "fed-tht-label-check",
    env: "test"
  } as AppConfigService;
  it("reports ok, the service, env, and a reachable database", async () => {
    const databaseHealth = {
      check: () => Promise.resolve({ reachable: true })
    } as DatabaseHealthService;
    const controller = new HealthController(config, databaseHealth);
    await expect(controller.check()).resolves.toEqual({
      status: "ok",
      service: "fed-tht-label-check",
      env: "test",
      database: { reachable: true }
    });
  });
  it("surfaces an unreachable database in the response", async () => {
    const databaseHealth = {
      check: () => Promise.resolve({ reachable: false, error: "connection refused" })
    } as DatabaseHealthService;
    const controller = new HealthController(config, databaseHealth);
    const result = await controller.check();
    expect(result.status).toBe("ok");
    expect(result.database).toEqual({
      reachable: false,
      error: "connection refused"
    });
  });
});
