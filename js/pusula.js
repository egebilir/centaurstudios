/* ============================================
   Pusula Landing — Smart Store Links
   Routes Android visitors to Google Play and
   everyone else (iOS + desktop) to the App Store.
   ============================================ */

(function () {
  'use strict';

  var APP_STORE_URL = 'https://apps.apple.com/tr/app/pusula-quran-verses-prayers/id6786255399';
  var PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=online.centaurstudios.pusula';

  function isAndroid() {
    return /android/i.test(navigator.userAgent);
  }

  function showToast(message) {
    var toast = document.getElementById('pusulaToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      toast.classList.remove('visible');
    }, 3200);
  }

  function withUtm(url, link) {
    var slug = link.getAttribute('data-slug');
    var cluster = link.getAttribute('data-cluster');
    if (!slug && !cluster) return url;
    try {
      var u = new URL(url);
      u.searchParams.set('utm_source', 'website');
      u.searchParams.set('utm_medium', 'organic');
      u.searchParams.set('utm_campaign', cluster || 'unknown');
      u.searchParams.set('utm_content', slug || 'unknown');
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  function trackStoreClick(link) {
    if (typeof window.pusulaTrack === 'function') {
      window.pusulaTrack('app_store_click', {
        article_slug: link.getAttribute('data-slug'),
        cluster: link.getAttribute('data-cluster'),
        path: window.location.pathname
      });
    }
  }

  function initStoreLinks() {
    var links = document.querySelectorAll('.js-store-link');
    var android = isAndroid();

    links.forEach(function (link) {
      if (android && PLAY_STORE_URL) {
        link.href = withUtm(PLAY_STORE_URL, link);
        link.target = '_blank';
        link.rel = 'noopener';
        link.addEventListener('click', function () { trackStoreClick(link); });
      } else if (android && !PLAY_STORE_URL) {
        link.removeAttribute('href');
        link.style.cursor = 'pointer';
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var lang = document.documentElement.getAttribute('lang') === 'tr' ? 'tr' : 'en';
          showToast(lang === 'tr'
            ? 'Pusula için Android sürümü çok yakında! 🌿'
            : 'The Android version of Pusula is coming very soon! 🌿');
        });
      } else {
        link.href = withUtm(APP_STORE_URL, link);
        link.target = '_blank';
        link.rel = 'noopener';
        link.addEventListener('click', function () { trackStoreClick(link); });
      }
    });
  }

  // Static store badges (e.g. the two explicit App Store / Google Play
  // buttons in the download band) already have the correct per-store href
  // baked in — they don't go through initStoreLinks' smart-redirect logic,
  // but should still be tracked and UTM-tagged like everything else.
  function initStaticStoreBadges() {
    document.querySelectorAll('.store-badge:not(.js-store-link)').forEach(function (link) {
      if (link.href) link.href = withUtm(link.href, link);
      link.addEventListener('click', function () { trackStoreClick(link); });
    });
  }

  // Small sticky CTA bar for mobile article pages. Appears after the reader
  // has scrolled a bit (not immediately, to stay unobtrusive) and hides
  // again once the full bottom CTA band is on screen, so it never competes
  // with the real CTA.
  function initStickyCta() {
    var stickyCta = document.getElementById('pusulaStickyCta');
    if (!stickyCta) return;

    var SHOW_AFTER_PX = 600;
    var ctaBand = document.querySelector('.pusula-cta-band');

    function update() {
      var scrolled = window.scrollY || window.pageYOffset;
      var pastThreshold = scrolled > SHOW_AFTER_PX;
      var reachedCtaBand = false;
      if (ctaBand) {
        reachedCtaBand = ctaBand.getBoundingClientRect().top < window.innerHeight;
      }
      stickyCta.classList.toggle('visible', pastThreshold && !reachedCtaBand);
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initStoreLinks();
    initStaticStoreBadges();
    initStickyCta();
  });
})();
