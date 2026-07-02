import * as Joi from 'joi';

/**
 * The runtime configuration the rest of the app reads through
 * {@link AppConfigService}. This is operational settings only — it is NOT the
 * label *rules* config (the per-type domain data), which lives separately and
 * must never be wired into this.
 *
 * For Phase 1 this is deliberately tiny: just enough to prove each source
 * (local / test / production) loads and validates at startup.
 */
export interface AppConfig {
  /** Which environment produced these settings. */
  env: 'local' | 'test' | 'production';
  /** Port the HTTP server listens on. */
  port: number;
  /** Human-readable service name, surfaced on the health endpoint. */
  serviceName: string;
}

/**
 * Validated at startup so a missing or malformed setting fails when the
 * service boots, not mid-request.
 */
export const configSchema = Joi.object<AppConfig>({
  env: Joi.string().valid('local', 'test', 'production').required(),
  port: Joi.number().port().required(),
  serviceName: Joi.string().min(1).required(),
});
