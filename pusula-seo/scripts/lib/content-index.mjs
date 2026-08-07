import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_DIR, outputDirFor } from './paths.mjs';
import { readJSON } from './json-store.mjs';

/** Reads every content JSON file under pusula-seo/content/{type}/*.json. */
export function loadAllContent() {
  const items = [];
  if (!fs.existsSync(CONTENT_DIR)) return items;
  const typeDirs = fs.readdirSync(CONTENT_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const typeDir of typeDirs) {
    const typeDirPath = path.join(CONTENT_DIR, typeDir.name);
    const files = fs.readdirSync(typeDirPath).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      items.push(readJSON(path.join(typeDirPath, f)));
    }
  }
  return items;
}

/** True if this content's page has actually been rendered to a live HTML file. */
export function isPublished(content) {
  const dir = outputDirFor(content.content_type, content.slug);
  return fs.existsSync(path.join(dir, 'index.html'));
}

/** id -> content, for published items only (safe to link to). */
export function buildPublishedIndex() {
  const index = new Map();
  for (const item of loadAllContent()) {
    if (isPublished(item)) index.set(item.id, item);
  }
  return index;
}
