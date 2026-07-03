/**
 * Production config source: GCP Secret Manager.
 *
 * STUB — clearly marked. The real implementation will pull settings from
 * Google Secret Manager (via `@google-cloud/secret-manager`). What's left to
 * decide (and out of scope for Phase 1) is the exact wiring: the client
 * library setup, and how the individual secrets are named and grouped.
 *
 * Until that lands, production values are read from the process environment so
 * the source is swappable and the startup validation path is still exercised.
 * The point of this phase is that the wiring seam exists — the same swappable
 * idea as the label reader — not that production is finished.
 */
export function loadGcpConfig(): unknown {
  // TODO(phase-later): replace with a real Secret Manager fetch.
  return {
    env: 'production',
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    serviceName: process.env.SERVICE_NAME,
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  };
}
