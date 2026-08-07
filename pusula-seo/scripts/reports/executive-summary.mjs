#!/usr/bin/env node
/**
 * The "state of the project in under 30 seconds" report — today's visitors,
 * organic traffic, GSC impressions/position, App Store clicks, best
 * performing/converting article, and the SEO health score, closing with
 * the same capped Top Actions every other report uses.
 */
import { fetchGscPerformance } from '../gsc/fetch-performance.mjs';
import { fetchGa4Metrics } from '../ga4/fetch-metrics.mjs';
import { fetchPosthogMetrics } from '../posthog/fetch-metrics.mjs';
import { generateRecommendations } from '../advisor/generate-recommendations.mjs';
import { analyzeContent } from '../refresh/analyze-content.mjs';
import { computeSeoHealthScore } from '../lib/seo-health.mjs';
import { formatReport, formatNotConnected } from '../telegram/format.mjs';
import { loadAllContent, isPublished } from '../lib/content-index.mjs';
import { isMain } from '../lib/cli.mjs';

export async function buildExecutiveSummary() {
  const [gsc, ga4, posthog, advisor] = await Promise.all([
    fetchGscPerformance({ days: 1 }),
    fetchGa4Metrics({ days: 1 }),
    fetchPosthogMetrics({ days: 1 }),
    generateRecommendations()
  ]);

  const published = loadAllContent().filter(isPublished);
  const refreshCandidates = analyzeContent();
  const health = computeSeoHealthScore({ published, refreshCandidates, gsc });

  const bullets = [
    ga4.connected ? `Bugünkü ziyaretçi: ${ga4.totalSessions} (${ga4.organicSessions} organik)` : formatNotConnected('GA4 (ziyaretçi verisi)'),
    gsc.connected
      ? `Search Console: ${gsc.current.impressions} gösterim, ort. poz. ${gsc.current.avgPosition.toFixed(1)}`
      : formatNotConnected('Search Console'),
    ga4.connected && ga4.appStoreClicksByPage.length
      ? `App Store tıklaması: ${ga4.appStoreClicksByPage.reduce((s, p) => s + p.clicks, 0)} — en çok: ${ga4.appStoreClicksByPage[0].path}`
      : formatNotConnected('App Store tıklama verisi'),
    ga4.connected && ga4.topPages.length
      ? `En iyi performans: ${ga4.topPages[0].path} (${ga4.topPages[0].views} görüntülenme)`
      : `Toplam yayında ${published.length} içerik.`,
    `SEO Sağlık Skoru: ${health.score}/100${health.partial ? ' (kısmi — Search Console bağlanınca tamamlanır)' : ''}`
  ];

  const topActions = advisor.recommendations.slice(0, 3).map((r) => ({ label: r.summary, impact_score: r.impact_score }));

  const text = formatReport({ headline: 'Pusula — Yönetici Özeti', bullets, topActions });
  return { text, data: { gsc, ga4, posthog, advisor, health } };
}

if (isMain(import.meta.url)) {
  console.log((await buildExecutiveSummary()).text);
}
