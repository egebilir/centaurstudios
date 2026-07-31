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

  function initStoreLinks() {
    var links = document.querySelectorAll('.js-store-link');
    var android = isAndroid();

    links.forEach(function (link) {
      if (android && PLAY_STORE_URL) {
        link.href = PLAY_STORE_URL;
        link.target = '_blank';
        link.rel = 'noopener';
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
        link.href = APP_STORE_URL;
        link.target = '_blank';
        link.rel = 'noopener';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initStoreLinks);
})();
