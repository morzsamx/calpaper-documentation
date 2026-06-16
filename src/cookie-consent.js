(function () {
  var STORAGE_KEY = 'calpaper_cookie_consent_v1';
  var MEASUREMENT_ID = 'G-PD2N6V9X1L';
  var SCRIPT_ID = 'calpaper-google-analytics';
  var BANNER_CLASS = 'cookie-banner';
  var state = {
    banner: null
  };

  function readConsent() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function writeConsent(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      // Ignore storage failures and keep the current page usable.
    }
  }

  function setTrackingDisabled(disabled) {
    window['ga-disable-' + MEASUREMENT_ID] = disabled;
  }

  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];

    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }
  }

  function initializeAnalyticsQueue() {
    ensureGtag();

    if (window.__calpaperAnalyticsInitialized) {
      return;
    }

    window.gtag('js', new Date());
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('config', MEASUREMENT_ID, {
      anonymize_ip: true
    });

    window.__calpaperAnalyticsInitialized = true;
  }

  function loadAnalytics() {
    var existingScript;
    var script;

    setTrackingDisabled(false);
    initializeAnalyticsQueue();

    existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      return;
    }

    script = document.createElement('script');
    script.async = true;
    script.id = SCRIPT_ID;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
  }

  function deleteCookieEverywhere(name) {
    var hostname = window.location.hostname;
    var parts = hostname.split('.');
    var attempted = {};
    var domains = [''];
    var i;
    var domain;
    var cookie;

    domains.push(hostname);

    for (i = 0; i < parts.length - 1; i += 1) {
      domains.push(parts.slice(i).join('.'));
      domains.push('.' + parts.slice(i).join('.'));
    }

    for (i = 0; i < domains.length; i += 1) {
      domain = domains[i];

      if (attempted[domain]) {
        continue;
      }

      attempted[domain] = true;
      cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; path=/';

      if (domain) {
        cookie += '; domain=' + domain;
      }

      document.cookie = cookie;
    }
  }

  function clearAnalyticsCookies() {
    var cookies = document.cookie ? document.cookie.split(';') : [];
    var seen = {
      _ga: true,
      _gid: true,
      _gat: true
    };
    var i;
    var name;

    deleteCookieEverywhere('_ga');
    deleteCookieEverywhere('_gid');
    deleteCookieEverywhere('_gat');

    for (i = 0; i < cookies.length; i += 1) {
      name = cookies[i].split('=')[0].replace(/^\s+|\s+$/g, '');

      if (!/^_ga($|_)/.test(name) && !/^_gat/.test(name)) {
        continue;
      }

      if (seen[name]) {
        continue;
      }

      seen[name] = true;
      deleteCookieEverywhere(name);
    }
  }

  function disableAnalytics() {
    setTrackingDisabled(true);

    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }

    clearAnalyticsCookies();
  }

  function hideBanner() {
    if (!state.banner) {
      return;
    }

    state.banner.classList.remove('is-visible');
    state.banner.setAttribute('aria-hidden', 'true');
  }

  function showBanner() {
    if (!state.banner) {
      return;
    }

    state.banner.classList.add('is-visible');
    state.banner.setAttribute('aria-hidden', 'false');
  }

  function applyConsent(consent) {
    writeConsent(consent);

    if (consent === 'accepted') {
      loadAnalytics();
      window.location.reload();
      return;
    }

    disableAnalytics();
    hideBanner();
  }

  function buildBanner() {
    var banner;
    var acceptButton;
    var rejectButton;

    if (state.banner) {
      return;
    }

    banner = document.createElement('aside');
    banner.className = BANNER_CLASS;
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie preferences');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-hidden', 'true');
    banner.innerHTML =
      '<div class="cookie-banner-inner">' +
        '<div class="cookie-banner-copy">' +
          '<strong>Cookie preferences</strong>' +
          '<p>We use optional cookies and similar browser storage to improve site performance and understand which pages are most useful. You can continue without them.</p>' +
          '<p class="cookie-banner-note">You can change this choice anytime in Cookie Settings. See our <a class="cookie-banner-link" href="privacy-policy.html">Privacy Policy</a>.</p>' +
        '</div>' +
        '<div class="cookie-banner-actions">' +
          '<button class="cookie-banner-btn" type="button" data-cookie-reject>Continue without optional cookies</button>' +
          '<button class="cookie-banner-btn cookie-banner-btn-primary" type="button" data-cookie-accept>Allow optional cookies</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(banner);
    state.banner = banner;

    acceptButton = banner.querySelector('[data-cookie-accept]');
    rejectButton = banner.querySelector('[data-cookie-reject]');

    acceptButton.addEventListener('click', function () {
      applyConsent('accepted');
    });

    rejectButton.addEventListener('click', function () {
      applyConsent('rejected');
    });
  }

  function bindSettingsButtons() {
    var buttons = document.querySelectorAll('[data-cookie-settings]');
    var i;

    for (i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener('click', function (event) {
        event.preventDefault();
        showBanner();
      });
    }
  }

  function init() {
    var consent = readConsent();

    buildBanner();
    bindSettingsButtons();

    if (consent === 'accepted') {
      loadAnalytics();
      return;
    }

    disableAnalytics();

    if (consent !== 'rejected') {
      showBanner();
    }
  }

  init();
}());
