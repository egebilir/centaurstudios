import fs from 'node:fs';

/**
 * Accepts either the raw service-account JSON as a string (GitHub/Routine
 * secret style) or a path to a JSON key file (local dev style). Returns null
 * if unset — callers use that to report {connected:false} instead of crashing.
 */
export function loadGoogleCredentials(envVarName) {
  const raw = process.env[envVarName];
  if (!raw) return null;
  try {
    if (raw.trim().startsWith('{')) return JSON.parse(raw);
    return JSON.parse(fs.readFileSync(raw, 'utf8'));
  } catch (err) {
    throw new Error(`${envVarName} is set but is neither valid JSON nor a readable file path: ${err.message}`);
  }
}
