/* ============================================
   Pusula — Analytics (GA4 + PostHog)
   Loaded on every /pusula/* page (landing page
   and every generated content page) via a single
   shared <script> include — this file is the only
   place either ID is ever set.

   GA4 is live (property created, see pusula-seo
   RUNBOOK.md Phase 3 notes). PostHog is still a
   placeholder — fill in POSTHOG_KEY once that
   project exists. Until then PostHog no-ops safely
   (no broken requests, no console errors); GA4
   already fires for real.
   ============================================ */
(function () {
  'use strict';

  var GA4_MEASUREMENT_ID = 'G-4M3FKQ4227';
  var POSTHOG_KEY = 'phc_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // TODO(Phase 3): replace with the real PostHog project API key
  var POSTHOG_HOST = 'https://eu.posthog.com';

  var ga4Configured = GA4_MEASUREMENT_ID.indexOf('XXXX') === -1;
  var posthogConfigured = POSTHOG_KEY.indexOf('XXXX') === -1;

  // --- GA4 ---
  if (ga4Configured) {
    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_MEASUREMENT_ID);
  }

  // --- PostHog ---
  if (posthogConfigured) {
    var phScript = document.createElement('script');
    phScript.async = true;
    phScript.src = POSTHOG_HOST + '/static/array.js';
    phScript.onload = function () {
      window.posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, person_profiles: 'identified_only' });
    };
    document.head.appendChild(phScript);
  }

  /**
   * Fires an event to whichever analytics backends are configured. Safe to
   * call even when neither is set up yet (Phase 3 not done) — it's just a no-op.
   */
  function track(eventName, props) {
    if (window.gtag) window.gtag('event', eventName, props || {});
    if (window.posthog && window.posthog.capture) window.posthog.capture(eventName, props || {});
  }
  window.pusulaTrack = track;

  // Fire article_view once, on load, for content pages (identified by the
  // presence of a .js-store-link carrying data-slug/data-cluster — every
  // rendered article/hub page has one on its CTA).
  document.addEventListener('DOMContentLoaded', function () {
    var ctaLink = document.querySelector('.js-store-link[data-slug]');
    if (!ctaLink) return;
    track('article_view', {
      article_slug: ctaLink.getAttribute('data-slug'),
      cluster: ctaLink.getAttribute('data-cluster'),
      path: window.location.pathname
    });
  });
})();
