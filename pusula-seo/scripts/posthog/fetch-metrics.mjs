#!/usr/bin/env node
/**
 * PostHog metrics pull: per-article view counts and the article_view ->
 * app_store_click conversion funnel, using PostHog's Trends and Funnels
 * query endpoints.
 *
 * Requires POSTHOG_API_KEY + POSTHOG_PROJECT_ID (Phase 3 — a personal API
 * key with project read access, separate from the client-side snippet key).
 * Until then, returns {connected:false}.
 */
import { loadEnv } from '../lib/env.mjs';
import { isMain } from '../lib/cli.mjs';

loadEnv();

const SERVICE_NAME = 'PostHog';

function config() {
  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.POSTHOG_HOST || 'https://eu.posthog.com';
  if (!apiKey || !projectId) return null;
  return { apiKey, projectId, host };
}

async function trendQuery(cfg, eventName, dateFrom, breakdown) {
  const url = new URL(`${cfg.host}/api/projects/${cfg.projectId}/insights/trend/`);
  url.searchParams.set('events', JSON.stringify([{ id: eventName, type: 'events' }]));
  url.searchParams.set('date_from', dateFrom);
  if (breakdown) {
    url.searchParams.set('breakdown', breakdown);
    url.searchParams.set('breakdown_type', 'event');
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`PostHog trend query failed: HTTP ${res.status}`);
  return res.json();
}

async function funnelQuery(cfg, dateFrom) {
  const res = await fetch(`${cfg.host}/api/projects/${cfg.projectId}/insights/funnel/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events: [
        { id: 'article_view', order: 0 },
        { id: 'app_store_click', order: 1 }
      ],
      date_from: dateFrom
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`PostHog funnel query failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchPosthogMetrics({ days = 7 } = {}) {
  const cfg = config();
  if (!cfg) return { connected: false, service: SERVICE_NAME };

  try {
    const dateFrom = `-${days}d`;
    const [viewsBySlug, clicksBySlug, funnel] = await Promise.all([
      trendQuery(cfg, 'article_view', dateFrom, '$pathname'),
      trendQuery(cfg, 'app_store_click', dateFrom, 'article_slug'),
      funnelQuery(cfg, dateFrom)
    ]);

    const perArticleViews = (viewsBySlug.result || []).map((r) => ({ path: r.breakdown_value, views: r.count }));
    const perArticleClicks = (clicksBySlug.result || []).map((r) => ({ slug: r.breakdown_value, clicks: r.count }));

    const funnelSteps = funnel.result || [];
    const conversionRate = funnelSteps.length >= 2 && funnelSteps[0].count > 0
      ? funnelSteps[1].count / funnelSteps[0].count
      : null;

    return {
      connected: true,
      service: SERVICE_NAME,
      window_days: days,
      perArticleViews,
      perArticleClicks,
      funnel: { steps: funnelSteps, conversionRate }
    };
  } catch (err) {
    return { connected: false, service: SERVICE_NAME, error: err.message };
  }
}

if (isMain(import.meta.url)) {
  console.log(JSON.stringify(await fetchPosthogMetrics(), null, 2));
}
