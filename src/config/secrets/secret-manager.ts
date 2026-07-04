import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {ReaderConfig} from "../config.schema";

/**
 * Fetches secret values from GCP Secret Manager, used the same way in every
 * environment. Authentication is Application Default Credentials: a service
 * account in production, and `gcloud auth application-default login` locally.
 * The key is never read from the process environment, so an unrelated
 * `ANTHROPIC_API_KEY` that happens to be set can never be picked up.
 */

let client: SecretManagerServiceClient | undefined;

function secretClient(): SecretManagerServiceClient {
  client ??= new SecretManagerServiceClient();
  return client;
}

/**
 * Read one secret version's value. `name` is a full resource path, e.g.
 * `projects/<project>/secrets/<name>/versions/latest`.
 */
export async function fetchSecret(name: string): Promise<string> {
  const [version] = await secretClient().accessSecretVersion({name});
  const payload = version.payload?.data;
  if (!payload) {
    throw new Error(`secret "${name}" has no payload`);
  }
  return Buffer.from(payload).toString("utf8").trim();
}

/**
 * Fill in the reader's API key from Secret Manager, using its
 * `anthropicKeySecret` pointer. Degrades gracefully: an empty pointer skips the
 * fetch, and a failed fetch logs a warning and leaves the key empty so the app
 * still boots — the reader then fails clearly if it is actually used. Returns a
 * new reader object; the input is not mutated.
 */
export async function resolveReaderApiKey(reader: Record<string, unknown>): Promise<Record<string, unknown>> {
  const resolved = {...reader};
  const pointer = typeof reader.anthropicKeySecret === "string" ? reader.anthropicKeySecret : "";
  if (!pointer) {
    return resolved;
  }
  try {
    resolved.apiKey = await fetchSecret(pointer);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`reader API key could not be read from Secret Manager (${pointer}): ${reason}. The label reader will fail if used until this is fixed.`);
  }
  return resolved;
}

/** The shape a loader's reader section is expected to carry before resolving. */
export type PartialReader = Partial<ReaderConfig> & Record<string, unknown>;
