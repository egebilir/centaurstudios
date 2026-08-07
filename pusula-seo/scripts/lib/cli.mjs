import { pathToFileURL } from 'node:url';

/** True when this module was invoked directly (`node script.mjs`), not imported. */
export function isMain(importMetaUrl) {
  if (!process.argv[1]) return false;
  return importMetaUrl === pathToFileURL(process.argv[1]).href;
}
