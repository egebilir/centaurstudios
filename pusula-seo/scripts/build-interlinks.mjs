#!/usr/bin/env node
/**
 * Rebuilds topical-authority interlinking:
 *  1. Re-renders every published article (refreshes its related-content
 *     block against the current, larger published index — safe/idempotent).
 *  2. Rebuilds every cluster hub page (/pusula/kategori/{cluster}/).
 *  3. Rebuilds the top-level blog index (/pusula/blog/).
 */
import fs from 'node:fs';
import path from 'node:path';
import { isMain } from './lib/cli.mjs';
import {
  DATA_DIR, TEMPLATES_DIR, PUSULA_DIR, CONTENT_DIR, SITE_ORIGIN,
  clusterHubDir, clusterHubUrl, publicUrlFor, CONTENT_TYPE_PATHS
} from './lib/paths.mjs';
import { readJSON } from './lib/json-store.mjs';
import { renderTemplate, escapeHtml } from './lib/template.mjs';
import { loadAllContent, isPublished } from './lib/content-index.mjs';
import { renderArticle } from './render-article.mjs';
import { buildOgSvg } from './generate-og-image.mjs';
import sharp from 'sharp';

const CONTENT_TYPE_LABELS = {
  dua: 'Dua', ayet: 'Ayet', sure: 'Sure', 'esmaul-husna': 'Esmaül Hüsna', kissa: 'Kıssa', blog: 'Rehber'
};

async function writeHubOg(outDir, title, badge) {
  const svg = buildOgSvg({ title, badge });
  fs.mkdirSync(outDir, { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, 'og-image.png'));
}

function articleCardHtml(item, pusulaPrefix) {
  const url = `${pusulaPrefix}${CONTENT_TYPE_PATHS[item.content_type]}/${item.slug}/`;
  return `<a class="pusula-hub-card" href="${escapeHtml(url)}">
  <span class="type">${escapeHtml(CONTENT_TYPE_LABELS[item.content_type])}</span>
  <div class="title">${escapeHtml(item.title)}</div>
  <p class="dek">${escapeHtml(item.dek || '')}</p>
</a>`;
}

async function buildClusterHub(clusterMeta, publishedItems) {
  const items = publishedItems.filter((i) => i.cluster === clusterMeta.slug)
    .sort((a, b) => (b.published_date || '').localeCompare(a.published_date || ''));

  const outDir = clusterHubDir(clusterMeta.slug);
  const canonicalUrl = clusterHubUrl(clusterMeta.slug);
  const ogImageUrl = `${canonicalUrl}og-image.png`;
  const ROOT_PREFIX = '../../../';
  const PUSULA_PREFIX = '../../';

  const cardsHtml = items.length
    ? items.map((i) => articleCardHtml(i, PUSULA_PREFIX)).join('\n')
    : `<p style="color:var(--text-muted);">Bu küme için içerikler yakında yayınlanacak.</p>`;

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((i, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: publicUrlFor(i.content_type, i.slug),
      name: i.title
    }))
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Pusula', item: `${SITE_ORIGIN}/pusula/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_ORIGIN}/pusula/blog/` },
      { '@type': 'ListItem', position: 3, name: clusterMeta.name, item: canonicalUrl }
    ]
  };

  const tmpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'hub.html.tmpl'), 'utf8');
  const html = renderTemplate(tmpl, {
    meta_description: `${clusterMeta.description} Pusula'da ${clusterMeta.seo_keyword} ile ilgili dua, ayet ve rehberler.`.slice(0, 160),
    og_title: clusterMeta.hub_title,
    canonical_url: canonicalUrl,
    og_image_url: ogImageUrl,
    seo_title: `${clusterMeta.hub_title} | Pusula`,
    root_prefix: ROOT_PREFIX,
    pusula_prefix: PUSULA_PREFIX,
    hub_slug: clusterMeta.slug,
    hub_badge: `🕊️ ${clusterMeta.name}`,
    title: clusterMeta.hub_title,
    intro: clusterMeta.description,
    breadcrumb_extra_html: `<span class="sep">/</span><span aria-current="page">${escapeHtml(clusterMeta.name)}</span>`,
    cards_html: cardsHtml,
    itemlist_schema_json: JSON.stringify(itemListSchema),
    breadcrumb_schema_json: JSON.stringify(breadcrumbSchema)
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  await writeHubOg(outDir, clusterMeta.hub_title, 'KÜME');

  return { cluster: clusterMeta.slug, count: items.length };
}

async function buildBlogIndex(publishedItems, clustersMeta) {
  const outDir = path.join(PUSULA_DIR, 'blog');
  const canonicalUrl = `${SITE_ORIGIN}/pusula/blog/`;
  const ogImageUrl = `${canonicalUrl}og-image.png`;
  const ROOT_PREFIX = '../../';
  const PUSULA_PREFIX = '../';

  const clusterCardsHtml = clustersMeta.clusters.map((c) => {
    const count = publishedItems.filter((i) => i.cluster === c.slug).length;
    return `<a class="pusula-hub-card" href="${PUSULA_PREFIX}kategori/${c.slug}/">
  <span class="type">Küme</span>
  <div class="title">${escapeHtml(c.name)}</div>
  <p class="dek">${escapeHtml(c.description)} ${count ? `(${count} içerik)` : '(yakında)'}</p>
</a>`;
  }).join('\n');

  const recent = [...publishedItems]
    .sort((a, b) => (b.published_date || '').localeCompare(a.published_date || ''))
    .slice(0, 24);

  const articleCardsHtml = recent.length
    ? recent.map((i) => articleCardHtml(i, PUSULA_PREFIX)).join('\n')
    : `<p style="color:var(--text-muted);">İlk içerikler yakında burada olacak.</p>`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Pusula', item: `${SITE_ORIGIN}/pusula/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: canonicalUrl }
    ]
  };

  const tmpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'blog-index.html.tmpl'), 'utf8');
  const html = renderTemplate(tmpl, {
    meta_description: "Pusula Blog: sabır, kaygı, bereket, rızık ve daha fazlası için dua, ayet, kıssa ve Esmaül Hüsna rehberleri.",
    og_title: "Pusula Blog — Dua, Ayet ve Manevi Rehberlik",
    canonical_url: canonicalUrl,
    og_image_url: ogImageUrl,
    seo_title: "Pusula Blog | Dua, Ayet, Kıssa ve Esmaül Hüsna",
    root_prefix: ROOT_PREFIX,
    pusula_prefix: PUSULA_PREFIX,
    intro: "Sabır, kaygı, bereket, rızık ve daha fazlası için doğrulanmış ayetler, dualar, kıssalar ve Esmaül Hüsna rehberleri.",
    cluster_cards_html: clusterCardsHtml,
    article_cards_html: articleCardsHtml,
    breadcrumb_schema_json: JSON.stringify(breadcrumbSchema)
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  await writeHubOg(outDir, 'Pusula Blog — Dua, Ayet ve Manevi Rehberlik', 'BLOG');

  return { count: recent.length };
}

/**
 * Refreshes the "From the Blog" teaser on the hand-authored landing page
 * (pusula/index.html) with the 3 most recent published articles. Only
 * touches the content strictly between the BLOG_TEASER_CARDS marker
 * comments — everything else on that page is left exactly as written.
 * If the markers aren't found (someone edited them out), this logs a
 * warning and does nothing rather than guessing where to inject.
 */
function updateLandingPageTeaser(publishedItems) {
  const landingPath = path.join(PUSULA_DIR, 'index.html');
  if (!fs.existsSync(landingPath)) return { updated: false, count: 0 };

  const recent = [...publishedItems]
    .sort((a, b) => (b.published_date || '').localeCompare(a.published_date || ''))
    .slice(0, 3);

  // '' prefix: pusula/index.html *is* the /pusula/ root, so links need no
  // leading ../ the way hub/blog-index pages (one level deeper) do.
  const cardsHtml = recent.map((i) => articleCardHtml(i, '')).join('\n');

  const html = fs.readFileSync(landingPath, 'utf8');
  const startMarker = '<!-- BLOG_TEASER_CARDS_START -->';
  const endMarker = '<!-- BLOG_TEASER_CARDS_END -->';
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    console.warn('⚠ Blog teaser markers not found in pusula/index.html — skipping landing page update');
    return { updated: false, count: 0 };
  }

  const updated = html.slice(0, startIdx + startMarker.length)
    + '\n' + cardsHtml + '\n'
    + html.slice(endIdx);

  fs.writeFileSync(landingPath, updated, 'utf8');
  return { updated: true, count: recent.length };
}

export async function buildInterlinks() {
  const allContent = loadAllContent();
  const publishedContent = allContent.filter(isPublished);

  // 1. Re-render every published article so its related-content block sees
  //    the current full index (idempotent — safe to run repeatedly).
  for (const item of publishedContent) {
    const contentPath = path.join(CONTENT_DIR, item.content_type, `${item.slug}.json`);
    renderArticle(contentPath);
  }

  // 2. Rebuild cluster hubs.
  const clustersMeta = readJSON(path.join(DATA_DIR, 'clusters.json'));
  const hubResults = [];
  for (const cluster of clustersMeta.clusters) {
    hubResults.push(await buildClusterHub(cluster, publishedContent));
  }

  // 3. Rebuild the blog index.
  const blogIndexResult = await buildBlogIndex(publishedContent, clustersMeta);

  // 4. Refresh the landing page's "From the Blog" teaser.
  const landingTeaser = updateLandingPageTeaser(publishedContent);

  return {
    articlesRelinked: publishedContent.length, hubs: hubResults, blogIndex: blogIndexResult, landingTeaser
  };
}

if (isMain(import.meta.url)) {
  const result = await buildInterlinks();
  console.log(`✓ Re-linked ${result.articlesRelinked} articles`);
  result.hubs.forEach((h) => console.log(`✓ Hub /pusula/kategori/${h.cluster}/ — ${h.count} items`));
  console.log(`✓ Blog index — ${result.blogIndex.count} items shown`);
  console.log(result.landingTeaser.updated
    ? `✓ Landing page blog teaser — ${result.landingTeaser.count} items shown`
    : `⚠ Landing page blog teaser NOT updated`);
}
