#!/usr/bin/env node
import { isMain } from './lib/cli.mjs';
/**
 * Regenerates /sitemap.xml: preserves every existing <url> whose <loc> is
 * NOT one of our managed Pusula content prefixes (so other apps' pages,
 * the landing page, privacy/terms etc. are untouched), then appends fresh
 * entries for the blog index, every cluster hub, and every published
 * article.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, SITE_ORIGIN, publicUrlFor } from './lib/paths.mjs';
import { readJSON } from './lib/json-store.mjs';
import { loadAllContent, isPublished } from './lib/content-index.mjs';

const SITEMAP_PATH = path.join(REPO_ROOT, 'sitemap.xml');
const MANAGED_PREFIXES = [
  `${SITE_ORIGIN}/pusula/blog/`,
  `${SITE_ORIGIN}/pusula/dua/`,
  `${SITE_ORIGIN}/pusula/ayet/`,
  `${SITE_ORIGIN}/pusula/sure/`,
  `${SITE_ORIGIN}/pusula/esmaul-husna/`,
  `${SITE_ORIGIN}/pusula/kissalar/`,
  `${SITE_ORIGIN}/pusula/kategori/`
];

function parseExistingUrls(xml) {
  const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
  return blocks.filter((block) => {
    const locMatch = block.match(/<loc>(.*?)<\/loc>/);
    const loc = locMatch ? locMatch[1] : '';
    return !MANAGED_PREFIXES.some((prefix) => loc.startsWith(prefix));
  });
}

function urlBlock(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export function buildSitemap() {
  const existingXml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const preserved = parseExistingUrls(existingXml);

  const today = new Date().toISOString().slice(0, 10);
  const generated = [];

  generated.push(urlBlock(`${SITE_ORIGIN}/pusula/blog/`, today, 'daily', '0.8'));

  const clustersMeta = readJSON(path.join(REPO_ROOT, 'pusula-seo', 'data', 'clusters.json'));
  for (const cluster of clustersMeta.clusters) {
    generated.push(urlBlock(`${SITE_ORIGIN}/pusula/kategori/${cluster.slug}/`, today, 'weekly', '0.7'));
  }

  const published = loadAllContent().filter(isPublished);
  for (const item of published) {
    generated.push(urlBlock(
      publicUrlFor(item.content_type, item.slug),
      item.updated_date || item.published_date || today,
      'monthly',
      '0.6'
    ));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${preserved.join('\n')}\n${generated.join('\n')}\n</urlset>\n`;

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
  return { preservedCount: preserved.length, generatedCount: generated.length };
}

if (isMain(import.meta.url)) {
  const result = buildSitemap();
  console.log(`✓ sitemap.xml rebuilt — ${result.preservedCount} preserved, ${result.generatedCount} generated`);
}
