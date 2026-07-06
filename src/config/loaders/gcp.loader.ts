import {resolveReaderApiKey} from "../secrets/secret-manager";

/**
 * Production config source.
 *
 * PARTIAL STUB — non-secret settings are still read from the process
 * environment here (the swappable seam; grouping them into a real Secret
 * Manager fetch is out of scope for now). The reader's API key, however, is
 * already fetched from Secret Manager via the non-sensitive `anthropicKeySecret`
 * pointer — never from the environment — so an ambient `ANTHROPIC_API_KEY`
 * can never be picked up. The same fetch is used locally.
 */
export async function loadGcpConfig(): Promise<unknown> {
  // TODO(phase-later): read the non-secret settings from Secret Manager too.
  return {
    env: "production",
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    serviceName: process.env.SERVICE_NAME,
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    },
    reader: await resolveReaderApiKey({
      // Default to the fast OCR reader (the hard latency budget rules out the
      // model reader as the default — see decisions/reader-provider-and-latency).
      // The Anthropic key still resolves for the deterministic-first fallback.
      provider: process.env.READER_PROVIDER === "anthropic" ? "anthropic" : "google-vision",
      model: process.env.READER_MODEL ?? "claude-haiku-4-5",
      apiKey: "",
      anthropicKeySecret: process.env.ANTHROPIC_KEY_SECRET ?? "",
      timeoutMs: process.env.READER_TIMEOUT_MS ? Number(process.env.READER_TIMEOUT_MS) : 5000
    }),
    storage: {
      imageStore: "gcs",
      dir: "",
      bucket: process.env.GCS_BUCKET
    },
    cors: {
      origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : []
    }
  };
}
