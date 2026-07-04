import * as Joi from "joi";

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
  env: "local" | "test" | "production";
  /** Port the HTTP server listens on. */
  port: number;
  /** Human-readable service name, surfaced on the health endpoint. */
  serviceName: string;
  /** Postgres connection settings. In dev these point at the Compose database. */
  database: DatabaseConfig;
  /** The label reader (AI provider) settings. */
  reader: ReaderConfig;
  /** Where label images are kept (behind the storage swap point). */
  storage: StorageConfig;
  /** Cross-origin settings so the separate frontend app can call the backend. */
  cors: CorsConfig;
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
 * The real reader's model settings. The provider is a config choice so the
 * reader can be swapped. The API key is never committed and never read from the
 * environment: it is fetched at boot from GCP Secret Manager — in every
 * environment — using the non-sensitive secret reference below. If the fetch is
 * skipped or fails, `apiKey` stays empty and the reader fails clearly at call
 * time. The reference is provider-named (`anthropicKeySecret`) so a second AI
 * provider can add its own pointer alongside without ambiguity.
 */
export interface ReaderConfig {
  /**
   * Which reader fills the slot: `google-vision` (fast OCR + in-code extraction,
   * the default, chosen to meet the hard latency budget) or `anthropic` (the
   * model reader — higher reading quality, but latency it can't bound).
   */
  provider: "google-vision" | "anthropic";
  /** Model id for the `anthropic` reader, e.g. `claude-haiku-4-5`. */
  model: string;
  /**
   * The resolved key for the configured provider, filled in at boot from Secret
   * Manager. Empty until then (and if the fetch is skipped or fails). Not stored
   * in any config file.
   */
  apiKey: string;
  /**
   * The Secret Manager resource holding the Anthropic key, e.g.
   * `projects/<project>/secrets/<name>/versions/latest`. Non-sensitive — it is
   * only a pointer, so it lives in config. Empty disables the fetch.
   */
  anthropicKeySecret: string;
  /** How long to wait for the model before failing the read. */
  timeoutMs: number;
}

/**
 * The image storage swap point. In development images live in a folder on disk;
 * in production they live in Google's file storage. Which one is in use is this
 * config choice — the record stores only a reference either way.
 */
export interface StorageConfig {
  imageStore: "disk" | "gcs";
  /** Folder for the disk image store. */
  dir: string;
  /** Bucket name for the GCS image store (unused by disk). */
  bucket: string;
}

/**
 * The frontend is a separate app at its own web address, so the browser blocks
 * its requests unless the backend says that address is allowed (CORS). These are
 * the origins allowed to call the API — the frontend's address, plus the local
 * dev address.
 */
export interface CorsConfig {
  origins: string[];
}

/**
 * Validated at startup so a missing or malformed setting fails when the
 * service boots, not mid-request.
 */
export const configSchema = Joi.object<AppConfig>({
  env: Joi.string().valid("local", "test", "production").required(),
  port: Joi.number().port().required(),
  serviceName: Joi.string().min(1).required(),
  database: Joi.object<DatabaseConfig>({
    host: Joi.string().min(1).required(),
    port: Joi.number().port().required(),
    name: Joi.string().min(1).required(),
    user: Joi.string().min(1).required(),
    password: Joi.string().required()
  }).required(),
  reader: Joi.object<ReaderConfig>({
    provider: Joi.string().valid("google-vision", "anthropic").required(),
    model: Joi.string().min(1).required(),
    // Empty is allowed so dev/test boot without a key; the reader fails clearly
    // at call time if it is actually used without one.
    apiKey: Joi.string().allow("").required(),
    // The Anthropic Secret Manager pointer (non-sensitive). Empty disables it.
    anthropicKeySecret: Joi.string().allow("").required(),
    timeoutMs: Joi.number().integer().min(1).required()
  }).required(),
  storage: Joi.object<StorageConfig>({
    imageStore: Joi.string().valid("disk", "gcs").required(),
    dir: Joi.string().allow("").required(),
    bucket: Joi.string().allow("").required()
  }).required(),
  cors: Joi.object<CorsConfig>({
    origins: Joi.array().items(Joi.string()).required()
  }).required()
});
