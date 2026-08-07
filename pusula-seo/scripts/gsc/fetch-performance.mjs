#!/usr/bin/env node
/**
 * Google Search Console performance pull: impressions, clicks, CTR, average
 * position, broken down by page and by query, with a trailing-window
 * comparison to flag rising/declining pages.
 *
 * Requires GSC_SERVICE_ACCOUNT_JSON + GSC_SITE_URL (Phase 3 — the user adds
 * the service account as a verified user on the Search Console property
 * first). Until then, returns {connected:false} — callers must show that
 * honestly rather than inventing numbers.
 */
import { google } from 'googleapis';
import { loadEnv } from '../lib/env.mjs';
import { loadGoogleCredentials } from '../lib/google-auth.mjs';
import { isMain } from '../lib/cli.mjs';

loadEnv();

const SERVICE_NAME = 'Google Search Console';

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

async function queryWindow(searchconsole, siteUrl, startDate, endDate, dimensions = [], rowLimit = 200) {
  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions, rowLimit }
  });
  return res.data.rows || [];
}

function totals(rows) {
  const clicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);
  const impressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const avgPosition = rows.length
    ? rows.reduce((s, r) => s + (r.position || 0) * (r.impressions || 0), 0) / Math.max(impressions, 1)
    : 0;
  return { clicks, impressions, ctr, avgPosition };
}

export async function fetchGscPerformance({ days = 7 } = {}) {
  const credentials = loadGoogleCredentials('GSC_SERVICE_ACCOUNT_JSON');
  const siteUrl = process.env.GSC_SITE_URL;

  if (!credentials || !siteUrl) {
    return { connected: false, service: SERVICE_NAME };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    });
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const now = new Date();
    const currStart = new Date(now.getTime() - days * 86400000);
    const prevStart = new Date(currStart.getTime() - days * 86400000);

    const [currRows, prevRows, byPage, byQuery, byPageQuery] = await Promise.all([
      queryWindow(searchconsole, siteUrl, currStart, now),
      queryWindow(searchconsole, siteUrl, prevStart, currStart),
      queryWindow(searchconsole, siteUrl, currStart, now, ['page']),
      queryWindow(searchconsole, siteUrl, currStart, now, ['query']),
      // Combined page+query breakdown — needed to answer "how does article X
      // rank for its specific target keyword Y", which per-page and per-query
      // aggregates alone can't answer. Used by detect-milestones.mjs.
      queryWindow(searchconsole, siteUrl, currStart, now, ['page', 'query'], 500)
    ]);

    const curr = totals(currRows);
    const prev = totals(prevRows);

    const pages = byPage
      .map((r) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))
      .sort((a, b) => b.clicks - a.clicks);

    const queries = byQuery
      .map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))
      .sort((a, b) => b.impressions - a.impressions);

    const pageQueries = byPageQuery.map((r) => ({
      page: r.keys[0],
      query: r.keys[1],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position
    }));

    return {
      connected: true,
      service: SERVICE_NAME,
      window_days: days,
      current: curr,
      previous: prev,
      deltas: {
        clicks: curr.clicks - prev.clicks,
        impressions: curr.impressions - prev.impressions,
        ctr: curr.ctr - prev.ctr,
        avgPosition: curr.avgPosition - prev.avgPosition
      },
      pages,
      queries,
      pageQueries
    };
  } catch (err) {
    return { connected: false, service: SERVICE_NAME, error: err.message };
  }
}

if (isMain(import.meta.url)) {
  const result = await fetchGscPerformance();
  console.log(JSON.stringify(result, null, 2));
}
