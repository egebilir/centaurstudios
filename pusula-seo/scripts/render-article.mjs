#!/usr/bin/env node
/**
 * Renders a validated content JSON file into the final static HTML page
 * under /pusula/{type}/{slug}/index.html. Verse text always comes from
 * verses-cache.json — this file only ever reads that cache, never invents
 * verse text itself.
 *
 * Idempotent: safe to re-run (e.g. after new related content is published,
 * or during a content refresh) — that's what build-interlinks.mjs relies on.
 *
 * Usage: node scripts/render-article.mjs content/dua/sabir-duasi.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { isMain } from './lib/cli.mjs';
import {
  DATA_DIR, TEMPLATES_DIR, outputDirFor, publicUrlFor, clusterHubUrl, SITE_ORIGIN, CONTENT_TYPE_PATHS
} from './lib/paths.mjs';
import { readJSON } from './lib/json-store.mjs';
import { renderTemplate, escapeHtml, inlineMarkdown } from './lib/template.mjs';
import { validateArticle } from './validate-article.mjs';
import { buildPublishedIndex } from './lib/content-index.mjs';

const ROOT_PREFIX = '../../../';
const PUSULA_PREFIX = '../../';

const APP_STORE_URL = 'https://apps.apple.com/tr/app/pusula-quran-verses-prayers/id6786255399';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=online.centaurstudios.pusula';

const CONTENT_TYPE_LABELS = {
  dua: 'Dua',
  ayet: 'Ayet',
  sure: 'Sure',
  'esmaul-husna': 'Esmaül Hüsna',
  kissa: 'Kıssa',
  blog: 'Rehber'
};

function utmUrl(baseUrl, cluster, slug) {
  const u = new URL(baseUrl);
  u.searchParams.set('utm_source', 'website');
  u.searchParams.set('utm_medium', 'organic');
  u.searchParams.set('utm_campaign', cluster);
  u.searchParams.set('utm_content', slug);
  return u.toString();
}

function renderInlineText(text) {
  return inlineMarkdown(escapeHtml(text || ''));
}

function renderVerseBlock(block, versesCache) {
  const verse = versesCache.verses[block.ref];
  if (!verse) {
    throw new Error(`render-article: verse ${block.ref} missing from cache — validate-article.mjs should have caught this`);
  }
  const noteHtml = block.note ? `<p class="pusula-verse-note">${renderInlineText(block.note)}</p>` : '';
  return `<div class="pusula-verse-block">
  <p class="pusula-verse-arabic">${escapeHtml(verse.arabic)}</p>
  <p class="pusula-verse-turkish">"${escapeHtml(verse.tr_diyanet)}"</p>
  <p class="pusula-verse-ref">${escapeHtml(verse.surah_name_english)} Suresi, ${verse.ayah_number}. Ayet (${escapeHtml(verse.ref)}) — Diyanet İşleri Meali</p>
  ${noteHtml}
</div>`;
}

function renderDuaBlock(block) {
  const arabicHtml = block.arabic ? `<p class="pusula-verse-arabic" style="font-size:1.3rem;">${escapeHtml(block.arabic)}</p>` : '';
  const translitHtml = block.translit ? `<p class="pusula-verse-ref">${escapeHtml(block.translit)}</p>` : '';
  const noteHtml = block.note ? `<p class="pusula-verse-note">${renderInlineText(block.note)}</p>` : '';
  return `<div class="pusula-dua-block">
  ${arabicHtml}
  ${translitHtml}
  <p class="pusula-dua-text">${renderInlineText(block.turkish_dua)}</p>
  ${noteHtml}
</div>`;
}

function renderTakeawaysBlock(block) {
  const items = (block.items || []).map((i) => `<li>${renderInlineText(i)}</li>`).join('\n');
  return `<div class="pusula-takeaways">
  <h3>${escapeHtml(block.heading || 'Ne Yapabilirsin?')}</h3>
  <ul>${items}</ul>
</div>`;
}

function renderBlock(block, versesCache) {
  switch (block.type) {
    case 'heading':
      return `<h${block.level}>${renderInlineText(block.text)}</h${block.level}>`;
    case 'paragraph':
      return `<p>${renderInlineText(block.text)}</p>`;
    case 'list': {
      const tag = block.style === 'ordered' ? 'ol' : 'ul';
      const items = (block.items || []).map((i) => `<li>${renderInlineText(i)}</li>`).join('\n');
      return `<${tag}>${items}</${tag}>`;
    }
    case 'verse':
      return renderVerseBlock(block, versesCache);
    case 'dua':
      return renderDuaBlock(block);
    case 'quote_callout':
      return `<p class="pusula-quote-callout">${renderInlineText(block.text)}</p>`;
    case 'takeaways':
      return renderTakeawaysBlock(block);
    default:
      throw new Error(`Unknown body block type: "${block.type}"`);
  }
}

/**
 * Where to insert the conversion-focused extras (contextual CTAs, the mini
 * "you may also like" block) among the body blocks, expressed as "insert
 * right after body[index]". Deliberately conservative on short content —
 * a 280-word Esmaül Hüsna page shouldn't get interrupted 3 times.
 */
function computeInsertionPositions(body) {
  const total = body.length;
  const positions = {};
  if (total < 6) return positions; // too short to interrupt at all

  const paragraphIndices = body
    .map((b, i) => (b.type === 'paragraph' ? i : -1))
    .filter((i) => i !== -1);

  // "After the first 2-3 paragraphs" — the 3rd paragraph block if there are
  // that many. But verse-heavy "ayet" listicles front-load headings+verses
  // and only cluster their prose paragraphs near the end (intro + closing
  // discussion), so "3rd paragraph" there can land 80% through the article —
  // nowhere near "early". Take whichever is smaller: the paragraph-based
  // guess, or a flat 35% proportional cap.
  const paragraphBasedEarly = paragraphIndices.length
    ? paragraphIndices[Math.min(2, paragraphIndices.length - 1)]
    : total;
  positions.early = Math.min(paragraphBasedEarly, Math.floor(total * 0.35));

  if (total >= 10) {
    const midIdx = Math.floor(total / 2);
    if (midIdx > positions.early + 2) positions.mid = midIdx;
  }

  if (total >= 14 && positions.mid != null) {
    const relatedIdx = Math.floor(total * 0.72);
    if (relatedIdx > positions.mid + 2 && relatedIdx < total - 2) positions.miniRelated = relatedIdx;
  }

  return positions;
}

function renderInlineCta(text, slug, cluster) {
  return `<div class="pusula-inline-cta">
  <p class="pusula-inline-cta-text">${renderInlineText(text)}</p>
  <a href="#" class="js-store-link pusula-inline-cta-btn" data-slug="${escapeHtml(slug)}" data-cluster="${escapeHtml(cluster)}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    Pusula'da Keşfet
  </a>
</div>`;
}

function renderMiniRelated(items, pusulaPrefix) {
  if (!items.length) return '';
  const links = items.map((rel) => {
    const url = `${pusulaPrefix}${CONTENT_TYPE_PATHS[rel.content_type]}/${rel.slug}/`;
    return `<a href="${escapeHtml(url)}">${escapeHtml(rel.title)}</a>`;
  }).join('\n');
  return `<div class="pusula-mini-related">
  <div class="pusula-mini-related-title">İlginizi Çekebilir</div>
  <div class="pusula-mini-related-links">${links}</div>
</div>`;
}

function renderBody(body, versesCache, extras = {}) {
  const { positions = {}, ctaEarlyHtml, ctaMidHtml, miniRelatedHtml } = extras;
  const parts = [];

  body.forEach((block, i) => {
    parts.push(renderBlock(block, versesCache));
    if (positions.early === i && ctaEarlyHtml) parts.push(ctaEarlyHtml);
    if (positions.mid === i && ctaMidHtml) parts.push(ctaMidHtml);
    if (positions.miniRelated === i && miniRelatedHtml) parts.push(miniRelatedHtml);
  });

  return parts.join('\n\n');
}

function renderFaq(faq) {
  return faq.map((f) => `<details class="pusula-faq-item">
  <summary>${renderInlineText(f.q)}</summary>
  <p>${renderInlineText(f.a)}</p>
</details>`).join('\n');
}

function buildFaqSchema(faq, canonicalUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

function buildArticleSchema(content, canonicalUrl, ogImageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: content.title,
    description: content.meta_description,
    image: [ogImageUrl],
    datePublished: content.published_date,
    dateModified: content.updated_date,
    inLanguage: 'tr',
    author: { '@type': 'Organization', name: 'Centaur Studios', url: SITE_ORIGIN },
    publisher: {
      '@type': 'Organization',
      name: 'Centaur Studios',
      logo: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/assets/images/apps/pusula.png` }
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl }
  };
}

function buildBreadcrumbSchema(content, clusterMeta, canonicalUrl) {
  const items = [
    { name: 'Pusula', url: `${SITE_ORIGIN}/pusula/` },
    { name: 'Blog', url: `${SITE_ORIGIN}/pusula/blog/` },
    { name: clusterMeta.name, url: clusterHubUrl(content.cluster) },
    { name: content.title, url: canonicalUrl }
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url
    }))
  };
}

/** Shared resolution logic: related_slugs first, then same-cluster fallback
 * (most recent first), capped at `max`. Used for both the full bottom grid
 * and the lighter mid-article "you may also like" block. */
function resolveRelatedItems(content, publishedIndex, max) {
  const resolved = [];
  const seen = new Set([content.id]);

  for (const relId of content.related_slugs || []) {
    const rel = publishedIndex.get(relId);
    if (rel && !seen.has(rel.id)) {
      resolved.push(rel);
      seen.add(rel.id);
    }
  }

  if (resolved.length < max) {
    const sameCluster = [...publishedIndex.values()]
      .filter((c) => c.cluster === content.cluster && !seen.has(c.id))
      .sort((a, b) => (b.published_date || '').localeCompare(a.published_date || ''));
    for (const c of sameCluster) {
      if (resolved.length >= max) break;
      resolved.push(c);
      seen.add(c.id);
    }
  }

  return resolved.slice(0, max);
}

function renderRelatedCards(items) {
  if (items.length === 0) {
    return '<p style="color:var(--text-muted);font-size:0.9rem;">Bu kümede yakında daha fazla içerik yayınlanacak.</p>';
  }
  return items.map((rel) => {
    const url = `${PUSULA_PREFIX}${CONTENT_TYPE_PATHS[rel.content_type]}/${rel.slug}/`;
    return `<a class="pusula-related-card" href="${escapeHtml(url)}">
  <span class="type">${escapeHtml(CONTENT_TYPE_LABELS[rel.content_type])}</span>
  <span class="title">${escapeHtml(rel.title)}</span>
</a>`;
  }).join('\n');
}

export function renderArticle(contentPath) {
  const content = readJSON(contentPath);
  const validation = validateArticle(content);
  if (!validation.valid) {
    throw new Error(`renderArticle called on invalid content (${content.slug}):\n` + validation.errors.map((e) => ` - ${e}`).join('\n'));
  }

  const versesCache = readJSON(path.join(DATA_DIR, 'verses-cache.json'));
  const clustersMeta = readJSON(path.join(DATA_DIR, 'clusters.json'));
  const clusterMeta = clustersMeta.clusters.find((c) => c.slug === content.cluster);
  if (!clusterMeta) throw new Error(`Unknown cluster "${content.cluster}" — add it to data/clusters.json first`);

  const canonicalUrl = publicUrlFor(content.content_type, content.slug);
  const ogImageUrl = `${canonicalUrl}og-image.png`;
  const publishedIndex = buildPublishedIndex();
  // Include self so related-card resolution among *other* seed articles in
  // the same batch works even before this file is written to disk.
  publishedIndex.set(content.id, content);

  const tmplPath = path.join(TEMPLATES_DIR, 'article.html.tmpl');
  const tmpl = fs.readFileSync(tmplPath, 'utf8');

  // Conversion structure: full related grid (bottom) draws from the same
  // resolution as the mid-article "you may also like" mini-block, but the
  // mini-block prefers the *next* items (3rd/4th) over the ones already
  // shown at the bottom, so a reader who sees both isn't shown duplicates.
  const relatedItemsFull = resolveRelatedItems(content, publishedIndex, 4);
  const relatedItemsMini = relatedItemsFull.length > 2
    ? relatedItemsFull.slice(2, 4)
    : relatedItemsFull.slice(0, 2);

  const positions = computeInsertionPositions(content.body);
  const ctaEarlyText = clusterMeta.cta_early
    || `${clusterMeta.name} ile ilgili daha fazla içerik ve kişisel dualar için Pusula'yı deneyebilirsin.`;
  const ctaMidText = clusterMeta.cta_mid
    || `Pusula'da ${clusterMeta.seo_keyword} ile ilgili daha fazla ayet ve dua bulabilirsin.`;

  const data = {
    meta_description: content.meta_description,
    og_title: content.seo_title,
    canonical_url: canonicalUrl,
    og_image_url: ogImageUrl,
    published_date: content.published_date,
    updated_date: content.updated_date,
    cluster_name: clusterMeta.name,
    seo_title: content.seo_title,
    root_prefix: ROOT_PREFIX,
    pusula_prefix: PUSULA_PREFIX,
    cluster_hub_relative: `${PUSULA_PREFIX}kategori/${content.cluster}/`,
    slug: content.slug,
    cluster: content.cluster,
    title: content.title,
    content_type_label: CONTENT_TYPE_LABELS[content.content_type],
    dek: content.dek,
    updated_date_display: content.updated_date,
    body_html: renderBody(content.body, versesCache, {
      positions,
      ctaEarlyHtml: renderInlineCta(ctaEarlyText, content.slug, content.cluster),
      ctaMidHtml: renderInlineCta(ctaMidText, content.slug, content.cluster),
      miniRelatedHtml: renderMiniRelated(relatedItemsMini, PUSULA_PREFIX)
    }),
    faq_html: renderFaq(content.faq),
    cta_text: content.cta_text,
    app_store_url: utmUrl(APP_STORE_URL, content.cluster, content.slug),
    play_store_url: utmUrl(PLAY_STORE_URL, content.cluster, content.slug),
    related_html: renderRelatedCards(relatedItemsFull),
    article_schema_json: JSON.stringify(buildArticleSchema(content, canonicalUrl, ogImageUrl)),
    faq_schema_json: JSON.stringify(buildFaqSchema(content.faq, canonicalUrl)),
    breadcrumb_schema_json: JSON.stringify(buildBreadcrumbSchema(content, clusterMeta, canonicalUrl))
  };

  const html = renderTemplate(tmpl, data);

  const outDir = outputDirFor(content.content_type, content.slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

  return { canonicalUrl, outputPath: path.join(outDir, 'index.html') };
}

if (isMain(import.meta.url)) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/render-article.mjs <content.json path>');
    process.exit(1);
  }
  try {
    const result = renderArticle(path.resolve(filePath));
    console.log(`✓ Rendered ${result.canonicalUrl}`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}
