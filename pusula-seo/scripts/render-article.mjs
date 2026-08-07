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
  DATA_DIR, TEMPLATES_DIR, outputDirFor, publicUrlFor, clusterHubUrl, SITE_ORIGIN
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

function renderBody(body, versesCache) {
  return body.map((block) => {
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
  }).join('\n\n');
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

function renderRelatedCards(content, publishedIndex, clustersMeta) {
  const clusterMetaOf = (slug) => clustersMeta.clusters.find((c) => c.slug === slug);

  const resolved = [];
  const seen = new Set([content.id]);

  for (const relId of content.related_slugs || []) {
    const rel = publishedIndex.get(relId);
    if (rel && !seen.has(rel.id)) {
      resolved.push(rel);
      seen.add(rel.id);
    }
  }

  // Fill up to 3 with other published items from the same cluster, most recent first.
  if (resolved.length < 3) {
    const sameCluster = [...publishedIndex.values()]
      .filter((c) => c.cluster === content.cluster && !seen.has(c.id))
      .sort((a, b) => (b.published_date || '').localeCompare(a.published_date || ''));
    for (const c of sameCluster) {
      if (resolved.length >= 3) break;
      resolved.push(c);
      seen.add(c.id);
    }
  }

  if (resolved.length === 0) {
    return '<p style="color:var(--text-muted);font-size:0.9rem;">Bu kümede yakında daha fazla içerik yayınlanacak.</p>';
  }

  return resolved.slice(0, 4).map((rel) => {
    const url = `${PUSULA_PREFIX}${{
      dua: 'dua', ayet: 'ayet', sure: 'sure', 'esmaul-husna': 'esmaul-husna', kissa: 'kissalar', blog: 'blog'
    }[rel.content_type]}/${rel.slug}/`;
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
    body_html: renderBody(content.body, versesCache),
    faq_html: renderFaq(content.faq),
    cta_text: content.cta_text,
    app_store_url: utmUrl(APP_STORE_URL, content.cluster, content.slug),
    play_store_url: utmUrl(PLAY_STORE_URL, content.cluster, content.slug),
    related_html: renderRelatedCards(content, publishedIndex, clustersMeta),
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
