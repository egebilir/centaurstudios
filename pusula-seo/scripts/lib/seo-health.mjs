/**
 * SEO health score: 0-100, transparent and documented — not a black box.
 * Components (weights sum to 100 when GSC is connected; when it isn't, the
 * score is renormalized over just the available components and flagged
 * `partial: true` so it's never silently mistaken for a full score):
 *
 *  - structural (40 pts): fewer open refresh-queue candidates relative to
 *    total published content = healthier (orphans, staleness, broken links).
 *  - cadence (20 pts): how recently something was actually published,
 *    decaying to 0 over 3 days.
 *  - ctr (20 pts, GSC only): current CTR against a 3% benchmark.
 *  - position (20 pts, GSC only): current average position against a
 *    "position 50 or worse = 0" floor.
 */
export function computeSeoHealthScore({ published, refreshCandidates, gsc }) {
  const components = [];

  const structuralRatio = published.length > 0
    ? 1 - Math.min(1, refreshCandidates.length / published.length)
    : 1;
  components.push({ name: 'structural', weight: 40, score: structuralRatio * 40 });

  const mostRecent = published.reduce((latest, p) => {
    const d = new Date(p.published_date);
    return d > latest ? d : latest;
  }, new Date(0));
  const daysSinceLastPublish = published.length
    ? (Date.now() - mostRecent.getTime()) / 86400000
    : Infinity;
  const cadenceScore = Math.max(0, 1 - daysSinceLastPublish / 3) * 20;
  components.push({ name: 'cadence', weight: 20, score: cadenceScore });

  if (gsc.connected) {
    const ctrScore = Math.min(1, gsc.current.ctr / 0.03) * 20;
    const positionScore = Math.max(0, 1 - gsc.current.avgPosition / 50) * 20;
    components.push({ name: 'ctr', weight: 20, score: ctrScore });
    components.push({ name: 'position', weight: 20, score: positionScore });
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const totalScore = components.reduce((s, c) => s + c.score, 0);
  const score = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;

  return { score, components, partial: !gsc.connected };
}
