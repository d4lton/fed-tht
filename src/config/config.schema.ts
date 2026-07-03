import * as Joi from 'joi';

/**
 * The runtime configuration the rest of the app reads through
 * {@link AppConfigService}. This is operational settings only — it is NOT the
 * label *rules* config (the per-type domain data), which lives separately and
 * must never be wired into this.
 *
 * Kept small: just enough to prove each source (local / test / production)
 * loads and validates at startup, plus the database connection (Phase 3).
 */
export interface AppConfig {
  /** Which environment produced these settings. */
  env: 'local' | 'test' | 'production';
  /** Port the HTTP server listens on. */
  port: number;
  /** Human-readable service name, surfaced on the health endpoint. */
  serviceName: string;
  /** Postgres connection settings. In dev these point at the Compose database. */
  database: DatabaseConfig;
}

/**
 * Where to reach Postgres. The local password is a throwaway development value
 * kept in `config.local.json`; production credentials come from GCP.
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

/**
 * Validated at startup so a missing or malformed setting fails when the
 * service boots, not mid-request.
 */
export const configSchema = Joi.object<AppConfig>({
  env: Joi.string().valid('local', 'test', 'production').required(),
  port: Joi.number().port().required(),
  serviceName: Joi.string().min(1).required(),
  database: Joi.object<DatabaseConfig>({
    host: Joi.string().min(1).required(),
    port: Joi.number().port().required(),
    name: Joi.string().min(1).required(),
    user: Joi.string().min(1).required(),
    password: Joi.string().required(),
  }).required(),
});
