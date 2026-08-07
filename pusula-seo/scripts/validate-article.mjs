#!/usr/bin/env node
import { isMain } from './lib/cli.mjs';
/**
 * Hard accuracy/quality gate. An article that fails this NEVER gets rendered
 * or published — this is the thing standing between "hands-free" and
 * "hands-free but wrong." Every check here maps to a rule in STYLE_GUIDE.md.
 *
 * Usage: node scripts/validate-article.mjs content/dua/sabir-duasi.json
 *        import { validateArticle } from './validate-article.mjs'
 */
import path from 'node:path';
import { DATA_DIR } from './lib/paths.mjs';
import { readJSON } from './lib/json-store.mjs';

const CONTENT_TYPES = ['dua', 'ayet', 'sure', 'esmaul-husna', 'kissa', 'blog'];

const BANNED_HADITH_PHRASES = [
  /hadis-i şerif/i,
  /hadiste (geç|buyur)/i,
  /peygamberimiz\s*\(?s\.?a\.?v\.?\)?\s*(buyurmuş|buyurdu|söylemiş|demiş)/i,
  /hz\.?\s*muhammed\s*(buyurmuş|buyurdu|söylemiş|demiş)/i,
  /rivayet edilir ki.*(peygamber|hz\.)/i,
  /"[^"]{15,}"\s*\(?(buhari|müslim|tirmizi|ebu davud|nesai|ibn mace)\)?/i
];

const BANNED_FILLER_PHRASES = [
  /günümüzde/i,
  /hayatımızın her alanında/i,
  /bu yazımızda/i,
  /bu makalede/i,
  /malumunuz olduğu üzere/i,
  /hepimizin bildiği gibi/i
];

const MIN_WORDS = { default: 600, 'esmaul-husna': 280 };
const MIN_FAQ = 3;
const META_MIN = 110;
const META_MAX = 165;

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function collectBodyText(body) {
  const parts = [];
  for (const block of body) {
    if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'quote_callout') {
      parts.push(block.text || '');
    } else if (block.type === 'list' || block.type === 'takeaways') {
      parts.push(...(block.items || []));
      if (block.heading) parts.push(block.heading);
    } else if (block.type === 'dua') {
      parts.push(block.turkish_dua || '', block.note || '');
    } else if (block.type === 'verse') {
      parts.push(block.note || '');
    }
  }
  return parts.join(' ');
}

export function validateArticle(content) {
  const errors = [];
  const warnings = [];

  // --- structural required fields ---
  const requiredFields = ['id', 'content_type', 'cluster', 'slug', 'title', 'seo_title', 'meta_description', 'dek', 'published_date', 'updated_date', 'body', 'faq', 'cta_text'];
  for (const f of requiredFields) {
    if (content[f] === undefined || content[f] === null || content[f] === '') {
      errors.push(`Missing required field: "${f}"`);
    }
  }
  if (errors.length) return { valid: false, errors, warnings };

  if (!CONTENT_TYPES.includes(content.content_type)) {
    errors.push(`Unknown content_type "${content.content_type}" — must be one of ${CONTENT_TYPES.join(', ')}`);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(content.slug)) {
    errors.push(`slug "${content.slug}" must be lowercase, hyphen-separated, URL-safe`);
  }
  if (!Array.isArray(content.body) || content.body.length === 0) {
    errors.push('body must be a non-empty array of blocks');
  }
  if (!Array.isArray(content.faq) || content.faq.length < MIN_FAQ) {
    errors.push(`faq must have at least ${MIN_FAQ} entries (found ${Array.isArray(content.faq) ? content.faq.length : 0})`);
  } else {
    content.faq.forEach((f, i) => {
      if (!f.q || !f.a) errors.push(`faq[${i}] is missing "q" or "a"`);
    });
  }

  // --- meta description length ---
  const metaLen = (content.meta_description || '').length;
  if (metaLen < META_MIN || metaLen > META_MAX) {
    errors.push(`meta_description is ${metaLen} chars — must be ${META_MIN}-${META_MAX}`);
  }

  // --- word count ---
  const bodyText = collectBodyText(content.body || []);
  const words = wordCount(bodyText);
  const minWords = MIN_WORDS[content.content_type] ?? MIN_WORDS.default;
  if (words < minWords) {
    errors.push(`Body is ${words} words — minimum for "${content.content_type}" is ${minWords}`);
  }

  // --- takeaways block required ---
  const hasTakeaways = (content.body || []).some((b) => b.type === 'takeaways' && (b.items || []).length > 0);
  if (!hasTakeaways) {
    errors.push('body must include at least one "takeaways" block with ≥1 practical item');
  }

  // --- verse citations must resolve against the verified cache, byte-for-byte ---
  const verseRefsInBody = (content.body || []).filter((b) => b.type === 'verse').map((b) => b.ref);
  if (verseRefsInBody.length > 0) {
    const cache = readJSON(path.join(DATA_DIR, 'verses-cache.json'));
    for (const ref of verseRefsInBody) {
      if (!cache.verses[ref]) {
        errors.push(`Verse ${ref} is cited but not present in data/verses-cache.json — run fetch-verse.mjs first. NEVER hand-type verse text.`);
      }
    }
  }

  // --- hadith guardrail ---
  const allText = [
    content.title, content.dek, content.meta_description, content.cta_text,
    bodyText,
    ...(content.faq || []).flatMap((f) => [f.q, f.a])
  ].join(' \n ');

  for (const re of BANNED_HADITH_PHRASES) {
    if (re.test(allText)) {
      errors.push(`Blocked hadith-attribution phrasing detected (matches ${re}). V1 does not quote/attribute hadith — see STYLE_GUIDE.md.`);
    }
  }
  if (content.requires_hadith) {
    errors.push('Topic is flagged requires_hadith — must not be processed in V1.');
  }

  // --- filler phrases ---
  for (const re of BANNED_FILLER_PHRASES) {
    if (re.test(allText)) {
      warnings.push(`Filler phrase detected (matches ${re}) — reads as generic AI writing, rewrite it.`);
    }
  }

  // --- related content ---
  if (!Array.isArray(content.related_slugs) || content.related_slugs.length === 0) {
    warnings.push('related_slugs is empty — interlinking will fall back to cluster-only matches.');
  }

  return { valid: errors.length === 0, errors, warnings, wordCount: words };
}

if (isMain(import.meta.url)) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/validate-article.mjs <content.json path>');
    process.exit(1);
  }
  const content = readJSON(path.resolve(filePath));
  const result = validateArticle(content);

  if (result.warnings.length) {
    console.log('⚠ Warnings:');
    result.warnings.forEach((w) => console.log(`  - ${w}`));
  }

  if (result.valid) {
    console.log(`✓ Valid (${result.wordCount} words)`);
    process.exit(0);
  } else {
    console.log('✗ FAILED validation:');
    result.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(1);
  }
}
