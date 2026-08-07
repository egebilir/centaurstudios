#!/usr/bin/env node
import { isMain } from './lib/cli.mjs';
/**
 * Deterministic next-topic picker. Two sources, merged:
 *  1. data/topics.json — the evergreen pool (dua/ayet/sure/kissa/blog topics).
 *  2. data/esmaul-husna.json — always-available fallback: any name without a
 *     published_slug yet is a valid "esmaul-husna" topic, lowest priority so
 *     the curated pool is exhausted first, but the well never runs dry.
 *
 * Picks the highest-priority, non-cooldown, non-blocked, status="pool" topic.
 * Marks it "queued" as a side effect (idempotent to re-run: queued stays
 * queued until render-article.mjs marks it "published").
 */
import path from 'node:path';
import { DATA_DIR } from './lib/paths.mjs';
import { readJSON, writeJSON } from './lib/json-store.mjs';

const TOPICS_PATH = path.join(DATA_DIR, 'topics.json');
const ESMA_PATH = path.join(DATA_DIR, 'esmaul-husna.json');

function isInCooldown(topic, now) {
  return topic.cooldown_until && new Date(topic.cooldown_until) > now;
}

export function pickTopic({ now = new Date() } = {}) {
  const topicsFile = readJSON(TOPICS_PATH);

  // Already queued? Resume that one rather than picking a new one — avoids
  // orphaning an in-progress article if a run was interrupted.
  const alreadyQueued = topicsFile.topics.find((t) => t.status === 'queued');
  if (alreadyQueued) {
    return { ...alreadyQueued, _source: 'topics.json' };
  }

  const eligible = topicsFile.topics.filter(
    (t) => t.status === 'pool' && !isInCooldown(t, now)
  );

  if (eligible.length > 0) {
    eligible.sort((a, b) => b.priority - a.priority);
    const chosen = eligible[0];
    chosen.status = 'queued';
    writeJSON(TOPICS_PATH, topicsFile);
    return { ...chosen, _source: 'topics.json' };
  }

  // Fallback: next un-published Esmaül Hüsna name, in canonical order.
  const esmaFile = readJSON(ESMA_PATH);
  const nextName = esmaFile.names
    .filter((n) => !n.published_slug)
    .sort((a, b) => a.order - b.order)[0];

  if (!nextName) {
    return null; // pool AND esma are fully exhausted — orchestrator should alert, not crash
  }

  return {
    id: nextName.slug,
    content_type: 'esmaul-husna',
    cluster: 'esmaul-husna',
    slug: nextName.slug,
    primary_keyword: `${nextName.transliteration} anlamı`,
    search_intent: 'informational',
    priority: 1,
    status: 'pool',
    task_type: 'new',
    related_slugs: [],
    requires_hadith: false,
    _source: 'esmaul-husna.json',
    _esma: nextName
  };
}

export function markPublished(id, source) {
  if (source === 'esmaul-husna.json') {
    const esmaFile = readJSON(ESMA_PATH);
    const entry = esmaFile.names.find((n) => n.slug === id);
    if (entry) entry.published_slug = id;
    writeJSON(ESMA_PATH, esmaFile);
    return;
  }
  const topicsFile = readJSON(TOPICS_PATH);
  const entry = topicsFile.topics.find((t) => t.id === id);
  if (entry) {
    entry.status = 'published';
    entry.last_published = new Date().toISOString().slice(0, 10);
  }
  writeJSON(TOPICS_PATH, topicsFile);
}

if (isMain(import.meta.url)) {
  const topic = pickTopic();
  if (!topic) {
    console.error('No eligible topics remain in the pool or the Esmaül Hüsna fallback. Needs manual topic-pool expansion.');
    process.exit(1);
  }
  console.log(JSON.stringify(topic, null, 2));
}
