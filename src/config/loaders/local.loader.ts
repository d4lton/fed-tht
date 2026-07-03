import { readFileSync } from "fs";
import { join } from "path";

/**
 * Local-dev config source: reads `config/config.local.json` from the project
 * root. Harmless local defaults only — no secrets.
 *
 * The same local build runs two ways, and the database lives at a different
 * address in each: on your machine the app reaches Postgres at `localhost`;
 * inside Compose it reaches it by the database's service name. The file holds
 * the on-machine defaults; the Compose app service supplies the in-Compose
 * address via `DB_HOST` (and friends), applied as overrides here. Both sets are
 * local configuration — production credentials still come only from GCP.
 */
export function loadLocalConfig(): unknown {
  const path = join(process.cwd(), "config", "config.local.json");
  const config = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  config.database = applyDatabaseEnvOverrides(config.database);
  config.reader = applyReaderEnvOverrides(config.reader);
  return config;
}

function applyDatabaseEnvOverrides(existing: unknown): Record<string, unknown> {
  const database: Record<string, unknown> = {
    ...(existing as Record<string, unknown> | undefined)
  };
  const env = process.env;
  if (env.DB_HOST) {
    database.host = env.DB_HOST;
  }
  if (env.DB_PORT) {
    database.port = Number(env.DB_PORT);
  }
  if (env.DB_NAME) {
    database.name = env.DB_NAME;
  }
  if (env.DB_USER) {
    database.user = env.DB_USER;
  }
  if (env.DB_PASSWORD) {
    database.password = env.DB_PASSWORD;
  }
  return database;
}

/**
 * The real reader's key stays out of the repo: `config.local.json` holds an
 * empty default, and a real key is supplied via `ANTHROPIC_API_KEY` (with an
 * optional `READER_MODEL` override), applied here.
 */
function applyReaderEnvOverrides(existing: unknown): Record<string, unknown> {
  const reader: Record<string, unknown> = {
    ...(existing as Record<string, unknown> | undefined)
  };
  const env = process.env;
  if (env.ANTHROPIC_API_KEY) {
    reader.apiKey = env.ANTHROPIC_API_KEY;
  }
  if (env.READER_MODEL) {
    reader.model = env.READER_MODEL;
  }
  return reader;
}
