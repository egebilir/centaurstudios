import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SEO_ROOT = path.resolve(__dirname, '..', '..');
export const REPO_ROOT = path.resolve(SEO_ROOT, '..');
export const PUSULA_DIR = path.join(REPO_ROOT, 'pusula');
export const DATA_DIR = path.join(SEO_ROOT, 'data');
export const CONTENT_DIR = path.join(SEO_ROOT, 'content');
export const TEMPLATES_DIR = path.join(SEO_ROOT, 'templates');
export const METRICS_HISTORY_DIR = path.join(DATA_DIR, 'metrics-history');

export const SITE_ORIGIN = 'https://centaurstudios.online';

/** Folder name under /pusula/ for each content type. 'blog' pages live at /pusula/blog/. */
export const CONTENT_TYPE_PATHS = {
  dua: 'dua',
  ayet: 'ayet',
  sure: 'sure',
  'esmaul-husna': 'esmaul-husna',
  kissa: 'kissalar',
  blog: 'blog'
};

export function publicUrlFor(contentType, slug) {
  const folder = CONTENT_TYPE_PATHS[contentType];
  if (!folder) throw new Error(`Unknown content_type: ${contentType}`);
  return `${SITE_ORIGIN}/pusula/${folder}/${slug}/`;
}

export function outputDirFor(contentType, slug) {
  const folder = CONTENT_TYPE_PATHS[contentType];
  if (!folder) throw new Error(`Unknown content_type: ${contentType}`);
  return path.join(PUSULA_DIR, folder, slug);
}

export function clusterHubUrl(clusterSlug) {
  return `${SITE_ORIGIN}/pusula/kategori/${clusterSlug}/`;
}

export function clusterHubDir(clusterSlug) {
  return path.join(PUSULA_DIR, 'kategori', clusterSlug);
}
