import * as Joi from "joi";
import {AppConfig, configSchema} from "./config.schema";
import {loadGcpConfig} from "./loaders/gcp.loader";
import {loadLocalConfig} from "./loaders/local.loader";
import {loadTestConfig} from "./loaders/test.loader";

export type AppEnv = AppConfig["env"];

/** The config namespace the app reads through {@link AppConfigService}. */
export const APP_CONFIG_NAMESPACE = "app";

/**
 * Decide which source to load from, from the environment. Anything that isn't
 * `test` or `production` is treated as local dev.
 */
export function resolveEnv(): AppEnv {
  switch (process.env.NODE_ENV) {
    case "test":
      return "test";
    case "production":
      return "production";
    default:
      return "local";
  }
}

// Loaders may be sync (test reads a file) or async (local/prod may fetch
// secrets); `loadConfiguration` awaits the result either way.
const loaders: Record<AppEnv, () => unknown> = {
  local: loadLocalConfig,
  test: loadTestConfig,
  production: loadGcpConfig
};

/**
 * Load and validate the runtime config for the current environment. Wired into
 * `ConfigModule.forRoot({ load: [loadConfiguration] })`, so it runs at boot —
 * a missing or malformed setting throws here and stops the service from
 * starting, rather than surfacing mid-request.
 *
 * Callers never see which source produced the values; the source is swappable
 * behind this loader, the same idea as the swappable label reader.
 */
export async function loadConfiguration(): Promise<{ [APP_CONFIG_NAMESPACE]: AppConfig }> {
  const env = resolveEnv();
  const raw = await loaders[env]();
  const result: Joi.ValidationResult<AppConfig> = configSchema.validate(raw, {
    abortEarly: false,
    convert: true
  });
  if (result.error) {
    throw new Error(`Invalid runtime configuration for env "${env}": ${result.error.message}`);
  }
  return {[APP_CONFIG_NAMESPACE]: result.value};
}
