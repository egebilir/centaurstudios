#!/usr/bin/env node
/**
 * GA4 Data API pull: sessions, organic traffic, top pages, and App Store
 * CTA click events (fired client-side by js/pusula-analytics.js).
 *
 * Requires GA4_SERVICE_ACCOUNT_JSON + GA4_PROPERTY_ID (Phase 3). Until then,
 * returns {connected:false}.
 */
import { google } from 'googleapis';
import { loadEnv } from '../lib/env.mjs';
import { loadGoogleCredentials } from '../lib/google-auth.mjs';
import { isMain } from '../lib/cli.mjs';

loadEnv();

const SERVICE_NAME = 'GA4';

export async function fetchGa4Metrics({ days = 1 } = {}) {
  const credentials = loadGoogleCredentials('GA4_SERVICE_ACCOUNT_JSON');
  const propertyId = process.env.GA4_PROPERTY_ID;

  if (!credentials || !propertyId) {
    return { connected: false, service: SERVICE_NAME };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });
    const authClient = await auth.getClient();
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth: authClient });

    const dateRange = { startDate: `${days}daysAgo`, endDate: 'today' };

    const [overview, topPages, storeClicks] = await Promise.all([
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [dateRange],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }]
        }
      }),
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [dateRange],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 20
        }
      }),
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [dateRange],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            filter: { fieldName: 'eventName', stringFilter: { value: 'app_store_click' } }
          }
        }
      })
    ]);

    const channelRows = overview.data.rows || [];
    const organic = channelRows.find((r) => r.dimensionValues[0].value === 'Organic Search');
    const totalSessions = channelRows.reduce((s, r) => s + Number(r.metricValues[0].value || 0), 0);

    return {
      connected: true,
      service: SERVICE_NAME,
      window_days: days,
      totalSessions,
      organicSessions: organic ? Number(organic.metricValues[0].value) : 0,
      topPages: (topPages.data.rows || []).map((r) => ({
        path: r.dimensionValues[0].value,
        views: Number(r.metricValues[0].value)
      })),
      appStoreClicksByPage: (storeClicks.data.rows || []).map((r) => ({
        path: r.dimensionValues[0].value,
        clicks: Number(r.metricValues[0].value)
      }))
    };
  } catch (err) {
    return { connected: false, service: SERVICE_NAME, error: err.message };
  }
}

if (isMain(import.meta.url)) {
  console.log(JSON.stringify(await fetchGa4Metrics(), null, 2));
}
