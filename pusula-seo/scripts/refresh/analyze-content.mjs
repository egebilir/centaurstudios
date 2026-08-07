#!/usr/bin/env node
/**
 * Content Refresh Engine: scans every published article for signs it needs
 * attention — stale age, orphan status (no inbound links), dangling related
 * links, and traffic decline (once metrics-history has enough data). Writes
 * prioritized candidates to data/refresh-queue.json.
 *
 * Purely deterministic — no LLM involved. The orchestrator/advisor turn
 * these findings into narrated recommendations.
 */
import path from 'node:path';
import { DATA_DIR, METRICS_HISTORY_DIR } from '../lib/paths.mjs';
import { readJSON, writeJSON, readJSONL } from '../lib/json-store.mjs';
import { loadAllContent, isPublished } from '../lib/content-index.mjs';
import { isMain } from '../lib/cli.mjs';

const REFRESH_QUEUE_PATH = path.join(DATA_DIR, 'refresh-queue.json');
const STALE_AGE_DAYS = 90;
const DECLINE_THRESHOLD = -0.25;

function daysSince(dateStr) {
  return (Date.now() - new Date(dateStr).getTime()) / 86400000;
}

function computeInboundLinkCounts(publishedItems) {
  const counts = new Map(publishedItems.map((i) => [i.id, 0]));
  for (const item of publishedItems) {
    for (const relId of item.related_slugs || []) {
      if (counts.has(relId) && relId !== item.id) {
        counts.set(relId, counts.get(relId) + 1);
      }
    }
  }
  return counts;
}

/** Compares the last 7 recorded snapshots against the 7 before that. Needs
 * at least 8 days of metrics-history to say anything — returns null otherwise
 * (an honest "not enough data" rather than a guess). */
function analyzeTrend(slug) {
  const history = readJSONL(path.join(METRICS_HISTORY_DIR, `${slug}.jsonl`));
  if (history.length < 8) return null;

  const recent = history.slice(-7);
  const older = history.slice(-14, -7);
  if (older.length === 0) return null;

  const avg = (arr, key) => arr.reduce((s, r) => s + (r[key] || 0), 0) / arr.length;
  const recentClicks = avg(recent, 'clicks');
  const olderClicks = avg(older, 'clicks');
  if (olderClicks === 0) return null;

  return { recentClicks, olderClicks, pctChange: (recentClicks - olderClicks) / olderClicks };
}

export function analyzeContent() {
  const published = loadAllContent().filter(isPublished);
  const inboundCounts = computeInboundLinkCounts(published);
  const validIds = new Set(published.map((i) => i.id));

  const candidates = [];

  for (const item of published) {
    const reasons = [];
    let severity = 0;

    const age = daysSince(item.published_date);
    if (age > STALE_AGE_DAYS) {
      reasons.push(`İçerik ${Math.round(age)} gündür güncellenmedi (eşik: ${STALE_AGE_DAYS} gün).`);
      severity += 1;
    }

    if ((inboundCounts.get(item.id) || 0) === 0) {
      reasons.push('Hiçbir başka sayfadan bağlantı almıyor (orphan sayfa).');
      severity += 2;
    }

    const staleLinks = (item.related_slugs || []).filter((id) => !validIds.has(id));
    if (staleLinks.length > 0) {
      reasons.push(`${staleLinks.length} related_slugs girdisi artık geçerli değil: ${staleLinks.join(', ')}.`);
      severity += 1;
    }

    const trend = analyzeTrend(item.slug);
    if (trend && trend.pctChange < DECLINE_THRESHOLD) {
      reasons.push(`Tıklamalar son 7 günde %${Math.round(Math.abs(trend.pctChange) * 100)} düştü.`);
      severity += 2;
    }

    if (reasons.length > 0) {
      candidates.push({
        id: item.id,
        content_type: item.content_type,
        slug: item.slug,
        cluster: item.cluster,
        reasons,
        severity,
        detected_at: new Date().toISOString()
      });
    }
  }

  candidates.sort((a, b) => b.severity - a.severity);

  const queueFile = readJSON(REFRESH_QUEUE_PATH);
  queueFile.candidates = candidates;
  queueFile.last_scan = new Date().toISOString();
  writeJSON(REFRESH_QUEUE_PATH, queueFile);

  return candidates;
}

if (isMain(import.meta.url)) {
  const candidates = analyzeContent();
  console.log(`✓ Refresh scan complete — ${candidates.length} candidate(s)`);
  candidates.forEach((c) => console.log(`  [severity ${c.severity}] ${c.slug}: ${c.reasons.join(' ')}`));
}
