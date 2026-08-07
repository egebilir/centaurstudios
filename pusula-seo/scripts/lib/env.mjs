import fs from 'node:fs';
import path from 'node:path';
import { SEO_ROOT } from './paths.mjs';

/**
 * Loads pusula-seo/.env into process.env for local runs, without overriding
 * variables the runtime environment already set (the cloud Routine sets real
 * env vars directly; .env is a local-only convenience and never committed).
 */
export function loadEnv() {
  const envPath = path.join(SEO_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
