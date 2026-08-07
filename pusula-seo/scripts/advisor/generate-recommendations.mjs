#!/usr/bin/env node
/**
 * AI SEO Advisor — the deterministic half. Assembles refresh candidates,
 * low-CTR pages, and GSC-derived content-gap/opportunity queries into one
 * ranked list. This script only computes facts and an impact_score; turning
 * that into an explained, prioritized narrative is the agent's job (see
 * TELEGRAM_VOICE.md's "Top Actions" rule — reports show the top 1-3 only,
 * this list can be longer for the system's own record-keeping).
 */
import { fetchGscPerformance } from '../gsc/fetch-performance.mjs';
import { analyzeContent } from '../refresh/analyze-content.mjs';
import { loadAllContent, isPublished } from '../lib/content-index.mjs';
import { isMain } from '../lib/cli.mjs';

/** estimatedLift: rough proxy for traffic/conversion impact. confidence: 0-1.
 * effort: 1 (quick edit) - 3 (needs real research/rewrite). Simple, documented,
 * not a black box — tune the weights here if reality disagrees with them. */
function impactScore({ estimatedLift, confidence, effort }) {
  return (estimatedLift * confidence) / effort;
}

export async function generateRecommendations() {
  const recommendations = [];
  const published = loadAllContent().filter(isPublished);

  // 1. Refresh candidates (stale/orphan/broken-link/declining).
  const refreshCandidates = analyzeContent();
  for (const c of refreshCandidates.slice(0, 8)) {
    recommendations.push({
      type: 'refresh',
      target: c.slug,
      summary: `"${c.slug}" içeriğini gözden geçir: ${c.reasons[0]}`,
      details: c.reasons,
      impact_score: impactScore({ estimatedLift: c.severity, confidence: 0.7, effort: 1.5 })
    });
  }

  // 2. GSC-derived: low-CTR-for-position pages + content-gap opportunity queries.
  const gsc = await fetchGscPerformance({ days: 28 });
  if (gsc.connected) {
    const lowCtrPages = gsc.pages.filter((p) => p.position <= 10 && p.ctr < 0.02 && p.impressions > 50);
    for (const p of lowCtrPages.slice(0, 5)) {
      recommendations.push({
        type: 'low_ctr',
        target: p.page,
        summary: `"${p.page}" iyi sırada (poz. ${p.position.toFixed(1)}) ama tıklanma oranı düşük (%${(p.ctr * 100).toFixed(1)}) — başlığı/meta açıklamayı güçlendir.`,
        impact_score: impactScore({ estimatedLift: p.impressions * 0.02, confidence: 0.6, effort: 1 })
      });
    }

    const coveredKeywords = new Set(published.map((i) => (i.primary_keyword || '').toLowerCase()));
    const opportunityQueries = gsc.queries.filter(
      (q) => q.position > 10 && q.impressions > 30 && !coveredKeywords.has(q.query.toLowerCase())
    );
    for (const q of opportunityQueries.slice(0, 5)) {
      recommendations.push({
        type: 'content_gap',
        target: q.query,
        summary: `"${q.query}" araması için ${q.impressions} gösterim var ama sıralaman poz. ${q.position.toFixed(0)} — bu sorguyu hedefleyen yeni bir konu ekle.`,
        impact_score: impactScore({ estimatedLift: q.impressions * 0.05, confidence: 0.5, effort: 2 })
      });
    }
  }

  recommendations.sort((a, b) => b.impact_score - a.impact_score);

  return {
    recommendations,
    gscConnected: gsc.connected,
    totalPublished: published.length,
    generatedAt: new Date().toISOString()
  };
}

if (isMain(import.meta.url)) {
  const result = await generateRecommendations();
  console.log(JSON.stringify(result, null, 2));
}
