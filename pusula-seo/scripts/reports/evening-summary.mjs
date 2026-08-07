#!/usr/bin/env node
/** Daily evening summary: what actually happened today vs the morning plan. */
import { fetchGscPerformance } from '../gsc/fetch-performance.mjs';
import { fetchPosthogMetrics } from '../posthog/fetch-metrics.mjs';
import { generateRecommendations } from '../advisor/generate-recommendations.mjs';
import { formatReport, formatNotConnected } from '../telegram/format.mjs';
import { loadAllContent, isPublished } from '../lib/content-index.mjs';
import { isMain } from '../lib/cli.mjs';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function buildEveningSummary() {
  const [gsc, posthog, advisor] = await Promise.all([
    fetchGscPerformance({ days: 1 }),
    fetchPosthogMetrics({ days: 1 }),
    generateRecommendations()
  ]);

  const published = loadAllContent().filter(isPublished);
  const publishedToday = published.filter((p) => p.published_date === todayStr());

  const bullets = [
    publishedToday.length
      ? `Bugün yayınlanan: ${publishedToday.map((p) => p.title).join(', ')}`
      : 'Bugün yeni içerik yayınlanmadı.',
    gsc.connected ? `Bugün: ${gsc.current.clicks} tıklama, ${gsc.current.impressions} gösterim` : formatNotConnected('Search Console'),
    posthog.connected && posthog.funnel.conversionRate != null
      ? `Dönüşüm oranı: %${(posthog.funnel.conversionRate * 100).toFixed(1)}`
      : formatNotConnected('PostHog')
  ];

  const topActions = advisor.recommendations.slice(0, 3).map((r) => ({ label: r.summary, impact_score: r.impact_score }));

  const text = formatReport({ headline: 'Akşam Özeti', bullets, topActions });
  return { text, data: { gsc, posthog, advisor, publishedToday } };
}

if (isMain(import.meta.url)) {
  console.log((await buildEveningSummary()).text);
}
