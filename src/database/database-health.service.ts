import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "./database.constants";

export interface DatabaseHealth {
  reachable: boolean;
  /** A short reason when unreachable; omitted when reachable. */
  error?: string;
}

/**
 * A minimal, honest reachability check — not real persistence. It borrows a
 * connection and runs `SELECT 1`, so a stopped database genuinely reports
 * unreachable rather than the check being hard-coded to "ok". Whatever
 * data-access library the storage phase picks can replace this.
 */
@Injectable()
export class DatabaseHealthService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async check(): Promise<DatabaseHealth> {
    try {
      const client = await this.pool.connect();
      try {
        await client.query("SELECT 1");
      } finally {
        client.release();
      }
      return { reachable: true };
    } catch (error) {
      return { reachable: false, error: describeError(error) };
    }
  }
}

/**
 * A short, non-empty reason. A refused connection to localhost surfaces as an
 * `AggregateError` (IPv6 and IPv4 both refused) whose own message is blank, so
 * fall back to the underlying errors.
 */
function describeError(error: unknown): string {
  if (error instanceof AggregateError && error.errors.length > 0) {
    return error.errors.map((e) => describeError(e)).join("; ");
  }
  if (error instanceof Error) {
    return error.message || error.name;
  }
  return String(error);
}
