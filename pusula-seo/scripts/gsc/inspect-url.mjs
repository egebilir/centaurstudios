#!/usr/bin/env node
/**
 * Search Console URL Inspection API — indexing status for a specific URL.
 * Used to detect newly-indexed pages by diffing against the last snapshot
 * stored per-article in metrics-history.
 */
import { google } from 'googleapis';
import { loadEnv } from '../lib/env.mjs';
import { loadGoogleCredentials } from '../lib/google-auth.mjs';
import { isMain } from '../lib/cli.mjs';

loadEnv();

export async function inspectUrl(url) {
  const credentials = loadGoogleCredentials('GSC_SERVICE_ACCOUNT_JSON');
  const siteUrl = process.env.GSC_SITE_URL;

  if (!credentials || !siteUrl) {
    return { connected: false, service: 'Google Search Console' };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    });
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const res = await searchconsole.urlInspection.index.inspect({
      requestBody: { inspectionUrl: url, siteUrl }
    });

    const result = res.data.inspectionResult?.indexStatusResult;
    return {
      connected: true,
      url,
      verdict: result?.verdict, // e.g. "PASS", "NEUTRAL", "FAIL"
      coverageState: result?.coverageState,
      lastCrawlTime: result?.lastCrawlTime,
      indexed: result?.verdict === 'PASS'
    };
  } catch (err) {
    return { connected: false, service: 'Google Search Console', error: err.message };
  }
}

if (isMain(import.meta.url)) {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node scripts/gsc/inspect-url.mjs <url>');
    process.exit(1);
  }
  console.log(JSON.stringify(await inspectUrl(url), null, 2));
}
