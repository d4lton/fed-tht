import {readFileSync} from "fs";
import {join} from "path";

/**
 * Test config source: reads `config/config.test.json` from the project root.
 * Kept as a file (rather than values set in test setup) so the same
 * load-and-validate path the other environments use is exercised under test.
 */
export function loadTestConfig(): unknown {
  const path = join(process.cwd(), "config", "config.test.json");
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}
