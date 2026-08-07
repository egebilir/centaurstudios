#!/usr/bin/env node
/** Daily morning report: yesterday's numbers + today's plan + top actions. */
import path from 'node:path';
import { fetchGscPerformance } from '../gsc/fetch-performance.mjs';
import { fetchGa4Metrics } from '../ga4/fetch-metrics.mjs';
import { generateRecommendations } from '../advisor/generate-recommendations.mjs';
import { formatReport, formatNotConnected } from '../telegram/format.mjs';
import { loadAllContent, isPublished } from '../lib/content-index.mjs';
import { readJSON } from '../lib/json-store.mjs';
import { DATA_DIR } from '../lib/paths.mjs';
import { isMain } from '../lib/cli.mjs';

export async function buildMorningReport() {
  const [gsc, ga4, advisor] = await Promise.all([
    fetchGscPerformance({ days: 1 }),
    fetchGa4Metrics({ days: 1 }),
    generateRecommendations()
  ]);

  const published = loadAllContent().filter(isPublished);
  const topicsFile = readJSON(path.join(DATA_DIR, 'topics.json'));
  const nextTopic = topicsFile.topics
    .filter((t) => t.status === 'pool' || t.status === 'queued')
    .sort((a, b) => b.priority - a.priority)[0];

  const bullets = [
    gsc.connected ? `Dün: ${gsc.current.clicks} tıklama, ${gsc.current.impressions} gösterim` : formatNotConnected('Search Console'),
    ga4.connected ? `Dün ${ga4.totalSessions} oturum (${ga4.organicSessions} organik)` : formatNotConnected('GA4'),
    `Toplam yayında: ${published.length} içerik.`,
    nextTopic
      ? `Bugünkü plan: "${nextTopic.primary_keyword}" (${nextTopic.cluster})`
      : 'Bugün için planlanan konu yok — havuz genişletilmeli.'
  ];

  const topActions = advisor.recommendations.slice(0, 3).map((r) => ({ label: r.summary, impact_score: r.impact_score }));

  const text = formatReport({ headline: 'Günaydın! Sabah SEO Raporu', bullets, topActions });
  return { text, data: { gsc, ga4, advisor, nextTopic } };
}

if (isMain(import.meta.url)) {
  console.log((await buildMorningReport()).text);
}
