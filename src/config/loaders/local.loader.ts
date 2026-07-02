import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Local-dev config source: reads `config/config.local.json` from the project
 * root. Harmless local defaults only — no secrets.
 */
export function loadLocalConfig(): unknown {
  const path = join(process.cwd(), 'config', 'config.local.json');
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}
