/*!
 * ==========================================================================
 * LODGIFY — Labor / Labour Day / Fête du Travail 2026
 * Geo- AND language-targeted STICKY TOP BAR + EXIT POPUP
 * ==========================================================================
 * One self-contained file. Nothing else to add to the page.
 *
 *   <script src="/js/lodgify-ld2026.js" defer></script>
 *
 * Drop it anywhere in <body>, or in Webflow's "before </head>" slot — it
 * waits for DOM ready on its own, and putting it in <head> starts the geo
 * lookup earlier, so the bar lands sooner on a first visit.
 *
 * THREE VARIANTS
 *   US      United States            "Labor Day"      English
 *   CA_EN   Canada, English pages    "Labour Day"     English
 *   CA_FR   Canada, French pages     "Fête du Travail" French
 *   Anywhere else: nothing renders at all.
 *
 *   Country comes from Cloudflare's cdn-cgi/trace, cached in localStorage for
 *   24h (same key and shape as the snippet already on the site, so the two
 *   share one cache and one request). Language comes from <html lang> and
 *   falls back to a /fr/ path prefix — see resolveLanguage().
 *
 * WHAT IT RENDERS
 *   1. A sticky TOP BAR, injected as a position:fixed strip, animated in with
 *      the whole page pushed down underneath it in the same motion. See
 *      section 9 for why it is fixed rather than inserted into the flow.
 *   2. An EXIT POPUP, opened on a timer (CONFIG.popup.delay). Set
 *      CONFIG.popup.trigger to 'exit' for the old exit-intent behaviour, or
 *      'both' for whichever fires first.
 *   Both are dismissed independently and stay dismissed for
 *   CONFIG.*.dismissHours. Both hide themselves once the deadline passes.
 *
 * CSS ISOLATION
 *   Each surface renders inside its own Shadow DOM sandbox: none of this
 *   file's CSS can reach the host page and none of the host page's CSS can
 *   reach it. The only deliberate touches on the document are the top bar's
 *   push-down (section 9) and the scroll lock while the popup is open — both
 *   inline styles, both restored byte-exact.
 *
 * ARTWORK  ⚠ SET THESE BEFORE GOING LIVE
 *   CONFIG.art holds one photo + one "-50%" tag per variant. They are hosted
 *   files, not inlined, so this script stays ~90 KB instead of ~700 KB on
 *   every page view. The source images ship alongside this one in /assets.
 *   The URLs must be ABSOLUTE — they end up in a CSS url(), which resolves
 *   against the page's address, not this script's. See the block for why.
 *
 * COPY / DATES
 *   The visible date strings ("11:59 PM PT on September 8, 2026" and the
 *   French equivalent) are plain text in the MARKUP block. CONFIG.deadline
 *   drives the countdown and the auto-hide. Change them together.
 *
 * QA HELPERS (query string, no code changes needed)
 *   ?ldgeo=CA      force a country            e.g. /pricing/?ldgeo=CA
 *   ?ldlang=fr     force a language           combine: ?ldgeo=CA&ldlang=fr
 *   ?ldgeo=GB      a country with no campaign (should render nothing)
 *   ?ldexit=1      open the popup immediately, skip the trigger
 *   ?ldbar=1       show the bar even if it was dismissed
 *   ?ldreset=1     clear both dismissals and the cached country
 * ==========================================================================
 */

(function () {
  'use strict';

  /* =====================================================================
     1 · CONFIG
     ===================================================================== */
  var CONFIG = {
    // Countries that get a campaign. Anything else sees nothing.
    countries: ['US', 'CA'],

    // Offer deadline. ISO 8601 with an explicit offset so it is the same
    // instant for every visitor regardless of their local clock.
    // 11:59:59 PM Pacific on Labor Day (PDT = UTC-7).
    deadline: '2026-09-08T23:59:59-07:00',

    /* --- artwork ---------------------------------------------------------
       Live Webflow asset URLs. One entry per variant, so CA_FR can be given
       its own French "-50%" tag later without touching anything else. The
       source files are in /assets next to this script.

       NOTE they are .avif — that is Webflow's conversion. AVIF is fine on
       Chrome 85+, Firefox 93+, Edge 85+ and Safari 16.4+, but a visitor on
       Safari 16.3 or older gets no photo and no tag: the popup still works
       and stays readable (the dark panel and scrim are CSS), it just loses
       its background. If that matters, upload the .jpg/.png from /assets too
       and swap these for image-set() with the AVIF first.

       THEY MUST BE ABSOLUTE URLs. A bare filename or a site-relative path
       will NOT work: these land in a CSS url() inside the injected
       stylesheet, and the browser resolves that against the PAGE's address,
       not this script's. On /pricing/ , 'photo-us.jpg' would be fetched from
       lodgify.com/pricing/photo-us.jpg and 404.

       Background images need no CORS headers, so any static host works.
       Re-uploading to Webflow mints a new hash in the filename, so re-paste
       these if you swap a file. checkArt() below warns in the console if one
       of them is ever left as anything but an absolute URL. */
    art: {
      US:    { photo: 'https://cdn.prod.website-files.com/6a0183d56ceb2deec6fd2e8c/6a99cf49d1619c104d268b3d_photo-us.avif',
               tag:   'https://cdn.prod.website-files.com/6a0183d56ceb2deec6fd2e8c/6a99cf48be53e70944a0b4eb_tag-us.avif' },
      CA_EN: { photo: 'https://cdn.prod.website-files.com/6a0183d56ceb2deec6fd2e8c/6a99cf49dfd6b716b05aec7f_photo-ca.avif',
               tag:   'https://cdn.prod.website-files.com/6a0183d56ceb2deec6fd2e8c/6a99cf48c79e270c46cf359b_tag-ca.avif' },
      CA_FR: { photo: 'https://cdn.prod.website-files.com/6a0183d56ceb2deec6fd2e8c/6a99cf49dfd6b716b05aec7f_photo-ca.avif',
               tag:   'https://cdn.prod.website-files.com/6a0183d56ceb2deec6fd2e8c/6a99cf48c79e270c46cf359b_tag-ca.avif' }
    },

    // --- geo ---
    geoKey: 'geo_country',   // shared with the existing site snippet
    geoTTL: 864e5,           // 24h
    geoEndpoint: 'https://www.cloudflare.com/cdn-cgi/trace',
    geoTimeout: 2500,        // ms before we give up and show nothing
    setHtmlAttr: true,       // also mirror onto <html data-country="..">

    /* --- language --------------------------------------------------------
       Which pages count as French. <html lang> is authoritative on Webflow's
       localized pages; the path prefix is the fallback for anything that
       ships without it. */
    frenchLang: /^fr\b/i,
    frenchPath: /^\/fr(\/|$)/i,

    /* --- exit popup ---------------------------------------------------- */
    popup: {
      enabled: true,

      // 'timeout' — open CONFIG.popup.delay ms after load  (design default)
      // 'exit'    — open on exit intent only
      // 'both'    — whichever happens first
      trigger: 'timeout',
      delay: 6000,

      dismissKey: 'ldg_ld2026_modal_closed',
      dismissHours: 72,        // the design set's "dismissDays: 3"

      // exit-intent tuning, used by 'exit' and 'both'
      armDelay: 3000,          // don't arm the trigger for the first N ms
      mobileTrigger: 'scrollUp', // 'scrollUp' | 'timeout' | 'none'
      mobileTimeout: 25000,
      scrollUpVelocity: 900,   // px/sec upward flick that counts as an exit

      lockScroll: true
    },

    /* --- sticky top bar --------------------------------------------------
       The bar is injected as a position:fixed strip and the page is padded
       down to make room for it, so it works even though this script runs
       long after the page has rendered. See section 9 for the details. */
    bar: {
      enabled: true,

      dismissKey: 'ldg_ld2026_bar_closed',
      dismissHours: 72,

      // Entry / exit animation. Set animMs to 0 to disable; visitors with
      // prefers-reduced-motion get 0 automatically.
      animMs: 420,
      easing: 'cubic-bezier(.22,.61,.36,1)',

      // Retract on scroll down, slide back in at the very top.
      // Set to false for a bar that stays pinned no matter where you scroll.
      hideOnScroll: true,
      hideAtPx: 10,
      showAtPx: 0,

      zIndex: 2147482000,          // just under the exit popup

      /* PUSH-DOWN
         autoPush finds the elements that would otherwise end up underneath
         the bar and offsets them in sync with the entry animation:
           - <body> gets padding-top          (normal document flow)
           - position:fixed / sticky headers pinned to top:0 get top:<h>
           - <html> gets a --ldg-bar-h custom property, for 100vh heroes:
                 .hero { min-height: calc(100vh - var(--ldg-bar-h, 0px)); }
         Nothing has to be added to the page for this to work.

         pushSelector is the manual fallback, and it is only consulted when
         autoPush is FALSE — with autoPush on, <body> padding has already moved
         everything in normal flow, so also giving a tagged element its own
         margin would move it twice. That means any promo-banner="push-down"
         attributes left in Webflow by the older banner script are harmless
         here: set autoPush:false to go back to honouring them instead. */
      autoPush: true,
      pushSelector: '[promo-banner="push-down"]',
      cssVar: '--ldg-bar-h'
    }
  };

  /* =====================================================================
     2 · MARKUP — sticky top bar
     Verbatim from the three design files, one per variant.
     ===================================================================== */
  var BAR = {
    US: `<div class="ldg ldg-bar" id="ldgBar" data-ldg-variant="US" data-ldg-countdown role="region" aria-label="Labor Day offer">
  <div class="ldg-bar__in">
    <span class="ldg-bar__tag">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.6 6.6L21.5 9l-5 4.7 1.4 7L12 17.3 6.1 20.7l1.4-7L2.5 9l6.9-.4z"/></svg>
      Labor Day Sale
    </span>

    <p class="ldg-bar__msg">
      <strong>Save 50%</strong> on Professional and Ultimate yearly plans with the code
      <span class="ldg-code">LD2026</span>. <a href="https://use.lodgify.com/hubfs/Promos/New_Customers_Promo_TC.pdf" target="_blank" rel="noopener">T&amp;Cs apply</a>
    </p>

    <a class="ldg-bar__cta" href="https://www.lodgify.com/labor-day-promo/">
      <span>Claim 50% off</span>
      <span class="ldg-bar__arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M12 5l7 7-7 7"/></svg>
      </span>
    </a>

    <div class="ldg-count">
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="days">--</span><span class="ldg-count__lab">Days</span></div>
      <span class="ldg-bar__sep" aria-hidden="true">:</span>
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="hours">--</span><span class="ldg-count__lab">Hrs</span></div>
      <span class="ldg-bar__sep" aria-hidden="true">:</span>
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="minutes">--</span><span class="ldg-count__lab">Mins</span></div>
      <span class="ldg-bar__sep" aria-hidden="true">:</span>
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="seconds">--</span><span class="ldg-count__lab">Secs</span></div>
    </div>
  </div>

  <button class="ldg-bar__close" type="button" data-ldg-dismiss="bar" aria-label="Dismiss offer">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
  </button>
</div>`,
    CA_EN: `<div class="ldg ldg-bar" id="ldgBar" data-ldg-variant="CA_EN" data-ldg-countdown role="region" aria-label="Labour Day offer">
  <div class="ldg-bar__in">
    <span class="ldg-bar__tag">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M 12.00 1.50 L 13.60 5.20 L 16.00 4.40 L 15.20 8.00 L 19.60 6.60 L 18.00 9.80 L 22.20 10.40 L 17.70 13.10 L 19.80 16.40 L 13.70 15.20 L 13.70 21.20 L 10.30 21.20 L 10.30 15.20 L 4.20 16.40 L 6.30 13.10 L 1.80 10.40 L 6.00 9.80 L 4.40 6.60 L 8.80 8.00 L 8.00 4.40 L 10.40 5.20 L 12.00 1.50 Z"/></svg>
      Labour Day Sale
    </span>

    <p class="ldg-bar__msg">
      <strong>Save 50%</strong> on Professional and Ultimate yearly plans with the code
      <span class="ldg-code">LD2026</span>. <a href="https://use.lodgify.com/hubfs/Promos/New_Customers_Promo_TC.pdf" target="_blank" rel="noopener">T&amp;Cs apply</a>
    </p>

    <a class="ldg-bar__cta" href="https://www.lodgify.com/labour-day-promo/">
      <span>Claim 50% off</span>
      <span class="ldg-bar__arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M12 5l7 7-7 7"/></svg>
      </span>
    </a>

    <div class="ldg-count">
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="days">--</span><span class="ldg-count__lab">Days</span></div>
      <span class="ldg-bar__sep" aria-hidden="true">:</span>
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="hours">--</span><span class="ldg-count__lab">Hrs</span></div>
      <span class="ldg-bar__sep" aria-hidden="true">:</span>
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="minutes">--</span><span class="ldg-count__lab">Mins</span></div>
      <span class="ldg-bar__sep" aria-hidden="true">:</span>
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="seconds">--</span><span class="ldg-count__lab">Secs</span></div>
    </div>
  </div>

  <button class="ldg-bar__close" type="button" data-ldg-dismiss="bar" aria-label="Dismiss offer">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
  </button>
</div>`,
    CA_FR: `<div class="ldg ldg-bar" id="ldgBar" data-ldg-variant="CA_FR" data-ldg-countdown role="region" aria-label="Offre de la Fête du Travail">
  <div class="ldg-bar__in">
    <span class="ldg-bar__tag">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M 12.00 1.50 L 13.60 5.20 L 16.00 4.40 L 15.20 8.00 L 19.60 6.60 L 18.00 9.80 L 22.20 10.40 L 17.70 13.10 L 19.80 16.40 L 13.70 15.20 L 13.70 21.20 L 10.30 21.20 L 10.30 15.20 L 4.20 16.40 L 6.30 13.10 L 1.80 10.40 L 6.00 9.80 L 4.40 6.60 L 8.80 8.00 L 8.00 4.40 L 10.40 5.20 L 12.00 1.50 Z"/></svg>
      Fête du Travail
    </span>

    <p class="ldg-bar__msg">
      <strong>Économisez 50&nbsp;%</strong> sur les plans annuels Professional et Ultimate avec le code
      <span class="ldg-code">LD2026</span>. <a href="https://use.lodgify.com/hubfs/Promos/New_Customers_Promo_TC.pdf" target="_blank" rel="noopener">Conditions</a>
    </p>

    <a class="ldg-bar__cta" href="https://www.lodgify.com/labour-day-promo/">
      <span>J'en profite</span>
      <span class="ldg-bar__arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M12 5l7 7-7 7"/></svg>
      </span>
    </a>

    <div class="ldg-count">
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="days">--</span><span class="ldg-count__lab">Jours</span></div>
      <span class="ldg-bar__sep" aria-hidden="true">:</span>
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="hours">--</span><span class="ldg-count__lab">Hres</span></div>
      <span class="ldg-bar__sep" aria-hidden="true">:</span>
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="minutes">--</span><span class="ldg-count__lab">Min</span></div>
      <span class="ldg-bar__sep" aria-hidden="true">:</span>
      <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="seconds">--</span><span class="ldg-count__lab">Sec</span></div>
    </div>
  </div>

  <button class="ldg-bar__close" type="button" data-ldg-dismiss="bar" aria-label="Fermer l'offre">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
  </button>
</div>`
  };

  /* =====================================================================
     3 · MARKUP — exit popup
     Verbatim from the three design files, one per variant.
     ===================================================================== */
  var MODAL = {
    US: `<div class="ldg ldg-modal ldg-hide" id="ldgModal" data-ldg-variant="US" data-ldg-countdown role="dialog" aria-modal="true" aria-label="Labor Day Sale — 50% off">
  <div class="ldg-modal__box ldg-modal--panel">
    <div class="ldg-shot__bg" aria-hidden="true"></div>
    <div class="ldg-shot__panel" aria-hidden="true"></div>
    <div class="ldg-shot__scrim" aria-hidden="true"></div>

    <button class="ldg-modal__close" type="button" data-ldg-dismiss="modal" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>

    <div class="ldg-modal__logo">
      <svg viewBox="0 0 71 19" fill="currentColor" role="img" aria-label="Lodgify"><path d="M61.4287 18.6361H65.2264L70.9221 5.08969H66.4792L65.3642 10.4143C65.2859 10.8246 64.8161 10.845 64.719 10.3955L63.5444 5.08969H59.0624C57.2035 5.08969 56.6162 4.52278 56.6162 3.68024C56.6162 2.8377 57.1048 2.34909 57.927 2.34909C58.8854 2.34909 59.3756 3.11333 59.4727 3.876H63.2312C62.6643 1.38909 60.8242 0 58.1807 0C55.2647 0 53.4434 1.70387 53.4434 4.30666V5.08969H51.3292V8.26097H53.4434V15.0733H57.2802V8.27976H61.2141L60.0208 6.73249L62.8006 14.1525C62.9572 14.544 62.9368 14.9747 62.7818 15.3865L61.4318 18.6361H61.4287ZM48.5275 4.58072C49.76 4.58072 50.6417 3.81649 50.6417 2.72025C50.6417 1.624 49.7615 0.859767 48.5275 0.859767C47.2934 0.859767 46.4133 1.624 46.4133 2.72025C46.4133 3.81649 47.2934 4.58072 48.5275 4.58072ZM46.6091 15.0733H50.4459V5.08969H46.6091V15.0733ZM40.0316 12.0587C38.8774 12.0587 38.0349 11.2365 38.0349 10.0823C38.0349 8.92811 38.8759 8.10436 40.0316 8.10436C41.1874 8.10436 42.0283 8.92654 42.0283 10.0823C42.0283 11.238 41.1874 12.0587 40.0316 12.0587ZM35.2363 18.6361H39.8954C43.3016 18.6361 45.7477 16.3841 45.7477 13.2144V5.08969H41.9109V5.5783C41.9109 5.73491 41.7355 5.73491 41.5789 5.65661C40.6393 5.18679 39.9549 4.93309 38.9949 4.93309C36.1368 4.93309 34.552 7.26338 34.552 10.0228C34.552 13.0766 36.3138 14.6818 38.702 14.6818C39.7983 14.6818 40.6205 14.3498 41.6384 13.761C41.8921 13.6044 42.0879 13.7422 41.9908 13.9771C41.5601 14.9559 40.6408 15.4648 39.1719 15.4648H35.2379V18.6361H35.2363ZM28.0904 12.0587C26.9362 12.0587 26.0937 11.2365 26.0937 10.0823C26.0937 8.92811 26.9347 8.10436 28.0904 8.10436C29.2462 8.10436 30.0871 8.92654 30.0871 10.0823C30.0871 11.238 29.2462 12.0587 28.0904 12.0587ZM27.0145 15.2299C28.0513 15.2299 28.698 14.8979 29.6768 14.2903C29.8522 14.1728 30.0683 14.212 29.9697 14.4657L29.716 15.0733H33.8065V1.3703H29.9697V5.57987C29.9697 5.73648 29.7943 5.73648 29.6377 5.65817C28.7763 5.20715 28.1108 4.93465 27.132 4.93465C24.4509 4.93465 22.6108 6.95174 22.6108 10.0447C22.6108 13.1377 24.4697 15.2315 27.0145 15.2315V15.2299ZM16.4233 12.0587C15.2691 12.0587 14.4265 11.2365 14.4265 10.0823C14.4265 8.92811 15.2675 8.10436 16.4233 8.10436C17.579 8.10436 18.42 8.92654 18.42 10.0823C18.42 11.238 17.579 12.0587 16.4233 12.0587ZM16.4233 15.2299C19.6525 15.2299 21.9045 13.1158 21.9045 10.0807C21.9045 7.0457 19.6541 4.93152 16.4233 4.93152C13.1925 4.93152 10.9421 7.0457 10.9421 10.0807C10.9421 13.1158 13.1925 15.2299 16.4233 15.2299ZM2.48534 15.0733H10.0807V7.77079L2.6623 12.2732C2.38824 12.4486 2.05624 12.1761 2.19248 11.8629L6.46 1.3703H0V12.588C0 14.0366 1.03673 15.0749 2.48534 15.0749V15.0733Z"/></svg>
    </div>

    <div class="ldg-modal__tag">
      <div class="ldg-tag" role="img" aria-label="50% off — Labor Day Sale"></div>
    </div>

    <div class="ldg-modal__in">
      <h2 class="ldg-modal__h">50% off<br>for Labor&nbsp;Day</h2>

      <p class="ldg-modal__sub">
        Enjoy the long weekend. Let our vacation rental software take the shift.
      </p>

      <div class="ldg-modal__row">
        <div class="ldg-swap">
          <a class="ldg-btn" href="https://www.lodgify.com/labor-day-promo/">Claim 50% off</a>
          <a class="ldg-round" href="https://www.lodgify.com/labor-day-promo/" aria-label="Claim 50% off">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7"/></svg>
          </a>
        </div>
        <div class="ldg-coupon">
          <span class="ldg-coupon__label">Code</span>
          <button class="ldg-coupon__code" type="button" data-ldg-copy="LD2026" aria-label="Copy coupon code LD2026">
            <span data-ldg-copy-label>LD2026</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M15 5.5A2.5 2.5 0 0012.5 3H5.5A2.5 2.5 0 003 5.5v7A2.5 2.5 0 005.5 15"/></svg>
          </button>
        </div>
      </div>

      <p class="ldg-modal__fine">
        Use code <b class="ldg-code">LD2026</b> at checkout. For annual Professional and Ultimate plans only. <a href="https://use.lodgify.com/hubfs/Promos/New_Customers_Promo_TC.pdf" target="_blank" rel="noopener">T&amp;Cs apply</a>.
      </p>
    </div>

    <div class="ldg-timer">
      <span class="ldg-timer__lab">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>
        Offer ends in
      </span>
      <div class="ldg-count">
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="days">--</span><span class="ldg-count__lab">Days</span></div>
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="hours">--</span><span class="ldg-count__lab">Hours</span></div>
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="minutes">--</span><span class="ldg-count__lab">Mins</span></div>
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="seconds">--</span><span class="ldg-count__lab">Secs</span></div>
      </div>
      <span class="ldg-timer__rule" aria-hidden="true"></span>
      <p class="ldg-timer__ends">Ends <b>Tue, September 8</b><br class="ldg-brk"> 11:59 PM PT</p>
      <div class="ldg-timer__stack">
        <span class="ldg-chip">
          <span class="ldg-chip__ico"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.6 6.6L21.5 9l-5 4.7 1.4 7L12 17.3 6.1 20.7l1.4-7L2.5 9l6.9-.4z"/></svg></span>
          <span><b>4.8/5</b> from 5,000+ reviews</span>
        </span>
        <span class="ldg-chip">
          <span class="ldg-chip__ico"><svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.2 3v18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <g fill="currentColor">
          <rect x="4.6" y="4" width="16.4" height="1.6"/>
          <rect x="4.6" y="7.2" width="16.4" height="1.6"/>
          <rect x="4.6" y="10.4" width="16.4" height="1.6"/>
          <rect x="4.6" y="13.6" width="16.4" height="1.6"/>
          <rect x="4.6" y="4" width="7.6" height="5.4"/>
        </g>
        <g fill="#1B1D16">
          <circle cx="6.5" cy="5.4" r=".52"/><circle cx="8.4" cy="5.4" r=".52"/><circle cx="10.3" cy="5.4" r=".52"/>
          <circle cx="7.4" cy="7.3" r=".52"/><circle cx="9.4" cy="7.3" r=".52"/>
        </g>
        <rect x="4.6" y="4" width="16.4" height="11.2" fill="none" stroke="currentColor" stroke-width=".9"/>
      </svg></span>
          <span>Built for vacation rental hosts <b>in the US</b></span>
        </span>
      </div>
    </div>
  </div>
</div>`,
    CA_EN: `<div class="ldg ldg-modal ldg-hide" id="ldgModal" data-ldg-variant="CA_EN" data-ldg-countdown role="dialog" aria-modal="true" aria-label="Labour Day Sale — 50% off">
  <div class="ldg-modal__box ldg-modal--panel">
    <div class="ldg-shot__bg" aria-hidden="true"></div>
    <div class="ldg-shot__panel" aria-hidden="true"></div>
    <div class="ldg-shot__scrim" aria-hidden="true"></div>

    <button class="ldg-modal__close" type="button" data-ldg-dismiss="modal" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>

    <div class="ldg-modal__logo">
      <svg viewBox="0 0 71 19" fill="currentColor" role="img" aria-label="Lodgify"><path d="M61.4287 18.6361H65.2264L70.9221 5.08969H66.4792L65.3642 10.4143C65.2859 10.8246 64.8161 10.845 64.719 10.3955L63.5444 5.08969H59.0624C57.2035 5.08969 56.6162 4.52278 56.6162 3.68024C56.6162 2.8377 57.1048 2.34909 57.927 2.34909C58.8854 2.34909 59.3756 3.11333 59.4727 3.876H63.2312C62.6643 1.38909 60.8242 0 58.1807 0C55.2647 0 53.4434 1.70387 53.4434 4.30666V5.08969H51.3292V8.26097H53.4434V15.0733H57.2802V8.27976H61.2141L60.0208 6.73249L62.8006 14.1525C62.9572 14.544 62.9368 14.9747 62.7818 15.3865L61.4318 18.6361H61.4287ZM48.5275 4.58072C49.76 4.58072 50.6417 3.81649 50.6417 2.72025C50.6417 1.624 49.7615 0.859767 48.5275 0.859767C47.2934 0.859767 46.4133 1.624 46.4133 2.72025C46.4133 3.81649 47.2934 4.58072 48.5275 4.58072ZM46.6091 15.0733H50.4459V5.08969H46.6091V15.0733ZM40.0316 12.0587C38.8774 12.0587 38.0349 11.2365 38.0349 10.0823C38.0349 8.92811 38.8759 8.10436 40.0316 8.10436C41.1874 8.10436 42.0283 8.92654 42.0283 10.0823C42.0283 11.238 41.1874 12.0587 40.0316 12.0587ZM35.2363 18.6361H39.8954C43.3016 18.6361 45.7477 16.3841 45.7477 13.2144V5.08969H41.9109V5.5783C41.9109 5.73491 41.7355 5.73491 41.5789 5.65661C40.6393 5.18679 39.9549 4.93309 38.9949 4.93309C36.1368 4.93309 34.552 7.26338 34.552 10.0228C34.552 13.0766 36.3138 14.6818 38.702 14.6818C39.7983 14.6818 40.6205 14.3498 41.6384 13.761C41.8921 13.6044 42.0879 13.7422 41.9908 13.9771C41.5601 14.9559 40.6408 15.4648 39.1719 15.4648H35.2379V18.6361H35.2363ZM28.0904 12.0587C26.9362 12.0587 26.0937 11.2365 26.0937 10.0823C26.0937 8.92811 26.9347 8.10436 28.0904 8.10436C29.2462 8.10436 30.0871 8.92654 30.0871 10.0823C30.0871 11.238 29.2462 12.0587 28.0904 12.0587ZM27.0145 15.2299C28.0513 15.2299 28.698 14.8979 29.6768 14.2903C29.8522 14.1728 30.0683 14.212 29.9697 14.4657L29.716 15.0733H33.8065V1.3703H29.9697V5.57987C29.9697 5.73648 29.7943 5.73648 29.6377 5.65817C28.7763 5.20715 28.1108 4.93465 27.132 4.93465C24.4509 4.93465 22.6108 6.95174 22.6108 10.0447C22.6108 13.1377 24.4697 15.2315 27.0145 15.2315V15.2299ZM16.4233 12.0587C15.2691 12.0587 14.4265 11.2365 14.4265 10.0823C14.4265 8.92811 15.2675 8.10436 16.4233 8.10436C17.579 8.10436 18.42 8.92654 18.42 10.0823C18.42 11.238 17.579 12.0587 16.4233 12.0587ZM16.4233 15.2299C19.6525 15.2299 21.9045 13.1158 21.9045 10.0807C21.9045 7.0457 19.6541 4.93152 16.4233 4.93152C13.1925 4.93152 10.9421 7.0457 10.9421 10.0807C10.9421 13.1158 13.1925 15.2299 16.4233 15.2299ZM2.48534 15.0733H10.0807V7.77079L2.6623 12.2732C2.38824 12.4486 2.05624 12.1761 2.19248 11.8629L6.46 1.3703H0V12.588C0 14.0366 1.03673 15.0749 2.48534 15.0749V15.0733Z"/></svg>
    </div>

    <div class="ldg-modal__tag">
      <div class="ldg-tag" role="img" aria-label="50% off — Labour Day Sale"></div>
    </div>

    <div class="ldg-modal__in">
      <h2 class="ldg-modal__h">50% off<br>for Labour&nbsp;Day</h2>

      <p class="ldg-modal__sub">
        Enjoy the long weekend. Let our vacation rental software take the shift.
      </p>

      <div class="ldg-modal__row">
        <div class="ldg-swap">
          <a class="ldg-btn" href="https://www.lodgify.com/labour-day-promo/">Claim 50% off</a>
          <a class="ldg-round" href="https://www.lodgify.com/labour-day-promo/" aria-label="Claim 50% off">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7"/></svg>
          </a>
        </div>
        <div class="ldg-coupon">
          <span class="ldg-coupon__label">Code</span>
          <button class="ldg-coupon__code" type="button" data-ldg-copy="LD2026" aria-label="Copy coupon code LD2026">
            <span data-ldg-copy-label>LD2026</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M15 5.5A2.5 2.5 0 0012.5 3H5.5A2.5 2.5 0 003 5.5v7A2.5 2.5 0 005.5 15"/></svg>
          </button>
        </div>
      </div>

      <p class="ldg-modal__fine">
        Use code <b class="ldg-code">LD2026</b> at checkout. For annual Professional and Ultimate plans only. <a href="https://use.lodgify.com/hubfs/Promos/New_Customers_Promo_TC.pdf" target="_blank" rel="noopener">T&amp;Cs apply</a>.
      </p>
    </div>

    <div class="ldg-timer">
      <span class="ldg-timer__lab">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>
        Offer ends in
      </span>
      <div class="ldg-count">
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="days">--</span><span class="ldg-count__lab">Days</span></div>
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="hours">--</span><span class="ldg-count__lab">Hours</span></div>
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="minutes">--</span><span class="ldg-count__lab">Mins</span></div>
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="seconds">--</span><span class="ldg-count__lab">Secs</span></div>
      </div>
      <span class="ldg-timer__rule" aria-hidden="true"></span>
      <p class="ldg-timer__ends">Ends <b>Tue, September 8</b><br class="ldg-brk"> 11:59 PM PT</p>
      <div class="ldg-timer__stack">
        <span class="ldg-chip">
          <span class="ldg-chip__ico"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.6 6.6L21.5 9l-5 4.7 1.4 7L12 17.3 6.1 20.7l1.4-7L2.5 9l6.9-.4z"/></svg></span>
          <span><b>4.8/5</b> from 5,000+ reviews</span>
        </span>
        <span class="ldg-chip">
          <span class="ldg-chip__ico"><svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.2 3v18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <g fill="currentColor">
          <rect x="4.6" y="4" width="4.1" height="11.2"/>
          <rect x="16.9" y="4" width="4.1" height="11.2"/>
          <g transform="translate(8.12 5.22) scale(.386)"><path d="M 12.00 1.50 L 13.60 5.20 L 16.00 4.40 L 15.20 8.00 L 19.60 6.60 L 18.00 9.80 L 22.20 10.40 L 17.70 13.10 L 19.80 16.40 L 13.70 15.20 L 13.70 21.20 L 10.30 21.20 L 10.30 15.20 L 4.20 16.40 L 6.30 13.10 L 1.80 10.40 L 6.00 9.80 L 4.40 6.60 L 8.80 8.00 L 8.00 4.40 L 10.40 5.20 L 12.00 1.50 Z"/></g>
        </g>
        <rect x="4.6" y="4" width="16.4" height="11.2" fill="none" stroke="currentColor" stroke-width=".9"/>
      </svg></span>
          <span>Built for vacation rental hosts <b>in Canada</b></span>
        </span>
      </div>
    </div>
  </div>
</div>`,
    CA_FR: `<div class="ldg ldg-modal ldg-hide" id="ldgModal" data-ldg-variant="CA_FR" data-ldg-countdown role="dialog" aria-modal="true" aria-label="Fête du Travail — 50 % de rabais">
  <div class="ldg-modal__box ldg-modal--panel">
    <div class="ldg-shot__bg" aria-hidden="true"></div>
    <div class="ldg-shot__panel" aria-hidden="true"></div>
    <div class="ldg-shot__scrim" aria-hidden="true"></div>

    <button class="ldg-modal__close" type="button" data-ldg-dismiss="modal" aria-label="Fermer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>

    <div class="ldg-modal__logo">
      <svg viewBox="0 0 71 19" fill="currentColor" role="img" aria-label="Lodgify"><path d="M61.4287 18.6361H65.2264L70.9221 5.08969H66.4792L65.3642 10.4143C65.2859 10.8246 64.8161 10.845 64.719 10.3955L63.5444 5.08969H59.0624C57.2035 5.08969 56.6162 4.52278 56.6162 3.68024C56.6162 2.8377 57.1048 2.34909 57.927 2.34909C58.8854 2.34909 59.3756 3.11333 59.4727 3.876H63.2312C62.6643 1.38909 60.8242 0 58.1807 0C55.2647 0 53.4434 1.70387 53.4434 4.30666V5.08969H51.3292V8.26097H53.4434V15.0733H57.2802V8.27976H61.2141L60.0208 6.73249L62.8006 14.1525C62.9572 14.544 62.9368 14.9747 62.7818 15.3865L61.4318 18.6361H61.4287ZM48.5275 4.58072C49.76 4.58072 50.6417 3.81649 50.6417 2.72025C50.6417 1.624 49.7615 0.859767 48.5275 0.859767C47.2934 0.859767 46.4133 1.624 46.4133 2.72025C46.4133 3.81649 47.2934 4.58072 48.5275 4.58072ZM46.6091 15.0733H50.4459V5.08969H46.6091V15.0733ZM40.0316 12.0587C38.8774 12.0587 38.0349 11.2365 38.0349 10.0823C38.0349 8.92811 38.8759 8.10436 40.0316 8.10436C41.1874 8.10436 42.0283 8.92654 42.0283 10.0823C42.0283 11.238 41.1874 12.0587 40.0316 12.0587ZM35.2363 18.6361H39.8954C43.3016 18.6361 45.7477 16.3841 45.7477 13.2144V5.08969H41.9109V5.5783C41.9109 5.73491 41.7355 5.73491 41.5789 5.65661C40.6393 5.18679 39.9549 4.93309 38.9949 4.93309C36.1368 4.93309 34.552 7.26338 34.552 10.0228C34.552 13.0766 36.3138 14.6818 38.702 14.6818C39.7983 14.6818 40.6205 14.3498 41.6384 13.761C41.8921 13.6044 42.0879 13.7422 41.9908 13.9771C41.5601 14.9559 40.6408 15.4648 39.1719 15.4648H35.2379V18.6361H35.2363ZM28.0904 12.0587C26.9362 12.0587 26.0937 11.2365 26.0937 10.0823C26.0937 8.92811 26.9347 8.10436 28.0904 8.10436C29.2462 8.10436 30.0871 8.92654 30.0871 10.0823C30.0871 11.238 29.2462 12.0587 28.0904 12.0587ZM27.0145 15.2299C28.0513 15.2299 28.698 14.8979 29.6768 14.2903C29.8522 14.1728 30.0683 14.212 29.9697 14.4657L29.716 15.0733H33.8065V1.3703H29.9697V5.57987C29.9697 5.73648 29.7943 5.73648 29.6377 5.65817C28.7763 5.20715 28.1108 4.93465 27.132 4.93465C24.4509 4.93465 22.6108 6.95174 22.6108 10.0447C22.6108 13.1377 24.4697 15.2315 27.0145 15.2315V15.2299ZM16.4233 12.0587C15.2691 12.0587 14.4265 11.2365 14.4265 10.0823C14.4265 8.92811 15.2675 8.10436 16.4233 8.10436C17.579 8.10436 18.42 8.92654 18.42 10.0823C18.42 11.238 17.579 12.0587 16.4233 12.0587ZM16.4233 15.2299C19.6525 15.2299 21.9045 13.1158 21.9045 10.0807C21.9045 7.0457 19.6541 4.93152 16.4233 4.93152C13.1925 4.93152 10.9421 7.0457 10.9421 10.0807C10.9421 13.1158 13.1925 15.2299 16.4233 15.2299ZM2.48534 15.0733H10.0807V7.77079L2.6623 12.2732C2.38824 12.4486 2.05624 12.1761 2.19248 11.8629L6.46 1.3703H0V12.588C0 14.0366 1.03673 15.0749 2.48534 15.0749V15.0733Z"/></svg>
    </div>

    <div class="ldg-modal__tag">
      <div class="ldg-tag" role="img" aria-label="50% off — Labour Day Sale"></div>
    </div>

    <div class="ldg-modal__in">
      <h2 class="ldg-modal__h">50&nbsp;% DE RABAIS<br>pour la Fête du Travail&nbsp;!</h2>

      <p class="ldg-modal__sub">
        Profitez du long week-end. Laissez notre logiciel de location de vacances faire le travail.
      </p>

      <div class="ldg-modal__row">
        <div class="ldg-swap">
          <a class="ldg-btn" href="https://www.lodgify.com/labour-day-promo/">Profiter de 50&nbsp;% de rabais</a>
          <a class="ldg-round" href="https://www.lodgify.com/labour-day-promo/" aria-label="Profiter de 50 % de rabais">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7"/></svg>
          </a>
        </div>
        <div class="ldg-coupon">
          <span class="ldg-coupon__label">Code</span>
          <button class="ldg-coupon__code" type="button" data-ldg-copy="LD2026" aria-label="Copier le code promo LD2026">
            <span data-ldg-copy-label>LD2026</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M15 5.5A2.5 2.5 0 0012.5 3H5.5A2.5 2.5 0 003 5.5v7A2.5 2.5 0 005.5 15"/></svg>
          </button>
        </div>
      </div>

      <p class="ldg-modal__fine">
        Utilisez le code <b class="ldg-code">LD2026</b> lors du paiement.<br>
        Valide uniquement pour les Plans Professional et Ultimate annuels. <a href="https://use.lodgify.com/hubfs/Promos/New_Customers_Promo_TC.pdf" target="_blank" rel="noopener">Les conditions s'appliquent</a>.
      </p>
    </div>

    <div class="ldg-timer">
      <span class="ldg-timer__lab">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>
        Prend fin dans
      </span>
      <div class="ldg-count">
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="days">--</span><span class="ldg-count__lab">Jours</span></div>
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="hours">--</span><span class="ldg-count__lab">Heures</span></div>
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="minutes">--</span><span class="ldg-count__lab">Min</span></div>
        <div class="ldg-count__unit"><span class="ldg-count__num" data-unit="seconds">--</span><span class="ldg-count__lab">Sec</span></div>
      </div>
      <span class="ldg-timer__rule" aria-hidden="true"></span>
      <p class="ldg-timer__ends">Jusqu'au <b>mardi 8 septembre</b><br class="ldg-brk"> à 23&nbsp;h&nbsp;59 HAP</p>
      <div class="ldg-timer__stack">
        <span class="ldg-chip">
          <span class="ldg-chip__ico"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.6 6.6L21.5 9l-5 4.7 1.4 7L12 17.3 6.1 20.7l1.4-7L2.5 9l6.9-.4z"/></svg></span>
          <span><b>4,8/5</b> sur plus de 5&nbsp;000 avis</span>
        </span>
        <span class="ldg-chip">
          <span class="ldg-chip__ico"><svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.2 3v18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <g fill="currentColor">
          <rect x="4.6" y="4" width="4.1" height="11.2"/>
          <rect x="16.9" y="4" width="4.1" height="11.2"/>
          <g transform="translate(8.12 5.22) scale(.386)"><path d="M 12.00 1.50 L 13.60 5.20 L 16.00 4.40 L 15.20 8.00 L 19.60 6.60 L 18.00 9.80 L 22.20 10.40 L 17.70 13.10 L 19.80 16.40 L 13.70 15.20 L 13.70 21.20 L 10.30 21.20 L 10.30 15.20 L 4.20 16.40 L 6.30 13.10 L 1.80 10.40 L 6.00 9.80 L 4.40 6.60 L 8.80 8.00 L 8.00 4.40 L 10.40 5.20 L 12.00 1.50 Z"/></g>
        </g>
        <rect x="4.6" y="4" width="16.4" height="11.2" fill="none" stroke="currentColor" stroke-width=".9"/>
      </svg></span>
          <span>Conçu pour les hôtes <b>au Canada</b></span>
        </span>
      </div>
    </div>
  </div>
</div>`
  };

  /* =====================================================================
     4 · STYLES
     Shared sheet, verbatim from the design set (demo-page chrome removed),
     plus the French type overrides and the injection hardening below.
     __LDG_ROOT__ / __LDG_PHOTO__ / __LDG_TAG__ are filled in per variant
     at mount time — see cssFor().
     ===================================================================== */
  var CSS = `
/* ==========================================================================
   LODGIFY — Labor DAY SALE 2026 (UNITED STATES) · PHOTO-BACKGROUND SET
     1. .ldg-bar     — site-wide top strip
     2. .ldg-shot    — hero banner, full-bleed photo
     3. .ldg-modal   — exit popup, full-bleed photo
   Offer: 50% off Professional & Ultimate YEARLY plans · code LD2026
   Deadline: ONE constant in the JS config at the bottom of this file.
     NOTE the visible date strings ("11:59 PM PT on September 8, 2026") are
     plain text in the markup — if you move the deadline, update those too.
   SWAPPING THE PHOTO: one line — the --ldg-photo variable below. Point it at
   a hosted .jpg (url("https://…")) instead of the inlined data URI before
   this goes live; the data URI is only here so the file previews standalone.
   CTA: the label pill and the arrow trade places on hover (.ldg-swap). The
   travel distances are measured at runtime — see the swap script at the end.
   ========================================================================== */

__LDG_ROOT__{
  --ldg-yellow:#FFF65B;
  --ldg-yellow-deep:#F2E627;
  --ldg-ink:#141313;
  --ldg-white:#FFFFFF;
  --ldg-display:"RL Aqva","ITC Avant Garde Gothic",Jost,"Helvetica Neue",Arial,sans-serif;
  --ldg-body:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --ldg-photo:url("__LDG_PHOTO__");
  --ldg-panel-ar:2944 / 1895;
  --ldg-tagimg:url("__LDG_TAG__");
}

/* ---------- shared ---------- */
.ldg *,.ldg *::before,.ldg *::after{box-sizing:border-box}
.ldg{font-family:var(--ldg-body);letter-spacing:-.2px;-webkit-font-smoothing:antialiased}
.ldg-hide{display:none !important}
.ldg :focus-visible{outline:3px solid var(--ldg-yellow);outline-offset:3px;border-radius:6px}

.ldg-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  padding:17px 30px;border:0;border-radius:999px;cursor:pointer;white-space:nowrap;
  font-family:var(--ldg-body);font-size:17px;font-weight:600;letter-spacing:-.2px;
  text-decoration:none;color:var(--ldg-ink);background:var(--ldg-yellow);
}
.ldg-round{
  border-radius:50%;background:var(--ldg-yellow);color:var(--ldg-ink);
  display:grid;place-items:center;flex:0 0 auto;text-decoration:none;
}
.ldg-round svg{width:20px;height:20px}

/* --- the CTA swap: pill and arrow trade places on hover ---
   Geometry is entirely CSS: the arrow is absolutely positioned at the right
   edge and the pill reserves its space with padding-right, so on hover the
   pill shifts right by exactly the arrow's diameter and the arrow's \`right\`
   goes to \`100% - diameter\`, landing its left edge at 0. They trade places
   exactly at any width, with nothing measured at runtime, so the animation
   no longer depends on JavaScript having run. --ldg-rs is the only number. */
.ldg-swap{
  --ldg-rs:58px;
  position:relative;display:inline-flex;align-items:center;
  padding-right:var(--ldg-rs);
}
.ldg-swap .ldg-btn{position:relative;z-index:2}
.ldg-swap .ldg-round{
  position:absolute;right:0;top:50%;transform:translateY(-50%);z-index:1;
  width:var(--ldg-rs);height:var(--ldg-rs);
}
@media (hover:hover) and (pointer:fine){
  .ldg-swap .ldg-btn{
    transition:transform .42s cubic-bezier(.62,.04,.31,1),background-color .2s ease,box-shadow .2s ease;
  }
  .ldg-swap .ldg-round{
    transition:right .42s cubic-bezier(.62,.04,.31,1),background-color .2s ease,box-shadow .2s ease;
  }
  .ldg-swap:hover .ldg-btn,.ldg-swap:focus-within .ldg-btn{
    transform:translateX(var(--ldg-rs));
  }
  .ldg-swap:hover .ldg-round,.ldg-swap:focus-within .ldg-round{
    right:calc(100% - var(--ldg-rs));
  }
  .ldg-swap:hover .ldg-btn,.ldg-swap:hover .ldg-round{
    background:var(--ldg-yellow-deep);box-shadow:0 12px 26px rgba(0,0,0,.3);
  }
}

/* coupon chip — glass on photo */
.ldg-coupon{
  display:inline-flex;align-items:stretch;border-radius:14px;overflow:hidden;
  background:rgba(255,255,255,.1);backdrop-filter:blur(6px);
  box-shadow:inset 0 0 0 1.5px rgba(255,246,91,.5);
}
.ldg-coupon__label{
  display:flex;align-items:center;padding:0 14px;font-size:10px;font-weight:600;
  letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.72);
}
.ldg-coupon__code{
  display:flex;align-items:center;justify-content:center;gap:9px;padding:13px 17px;cursor:pointer;
  border:0;border-left:1.5px dashed rgba(255,246,91,.5);background:transparent;
  font-family:var(--ldg-display);font-size:19px;font-weight:700;letter-spacing:.06em;
  color:var(--ldg-yellow);
}
.ldg-coupon__code:hover{background:rgba(255,246,91,.14)}
.ldg-coupon__code svg{width:14px;height:14px;opacity:.75}

/* --- the -50% tag --- */
.ldg-tag{
  /* the artwork itself — one PNG, so the shape, the hole, the type and the
     flag foot are exactly as supplied. Sized by width; the height follows
     the artwork's own 572x262 ratio. The wrappers (.ldg-shot__tag /
     .ldg-modal__tag) still do all the scaling at each breakpoint. */
  display:block;width:226px;aspect-ratio:572 / 262;
  background:var(--ldg-tagimg) no-repeat center/contain;
  /* drop-shadow, not box-shadow: it follows the tag's silhouette instead of
     casting a rectangle behind its transparent corners */
  filter:drop-shadow(0 14px 26px rgba(0,0,0,.30));
}

/* countdown — on the dark glass bar */
.ldg-count{display:flex;align-items:flex-start;gap:8px}
.ldg-count__unit{display:flex;flex-direction:column;align-items:center;min-width:56px;
  padding:9px 8px 8px;border-radius:14px;background:rgba(255,246,91,.13);
  box-shadow:inset 0 0 0 1px rgba(255,246,91,.24)}
.ldg-count__num{font-family:var(--ldg-display);font-size:27px;font-weight:700;line-height:1;
  letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--ldg-yellow)}
.ldg-count__lab{margin-top:5px;font-size:9px;font-weight:600;letter-spacing:.12em;
  text-transform:uppercase;color:rgba(255,255,255,.68)}

/* the glass timer bar, shared by hero + popup */
.ldg-timer{
  position:absolute;z-index:5;display:flex;align-items:center;gap:20px;
  padding:15px 30px 15px 24px;border-radius:20px;
  background:rgba(14,16,12,.62);backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,.14);
}
.ldg-timer__lab{display:flex;align-items:center;gap:10px;flex:0 0 auto;
  font-family:var(--ldg-display);font-size:12px;font-weight:700;letter-spacing:.16em;
  text-transform:uppercase;color:var(--ldg-white)}
.ldg-timer__lab svg{width:20px;height:20px;flex:0 0 auto}
.ldg-timer__rule{width:1px;height:34px;background:rgba(255,255,255,.16);flex:0 0 auto}
.ldg-timer__ends{margin:0;font-size:13px;line-height:1.35;color:rgba(255,255,255,.7);flex:0 0 auto}
.ldg-timer__ends b{color:var(--ldg-white);font-weight:600}
.ldg-timer__stack{display:flex;flex-direction:column;gap:8px;margin-left:auto;flex:0 0 auto}
/* hero: the two chips sit side by side so the bar reads in one line, and the
   whole row spreads evenly instead of pooling the slack in one gap */
.ldg-shot .ldg-timer{justify-content:space-between;gap:16px}
.ldg-shot .ldg-timer__stack{flex-direction:row;align-items:center;gap:22px;margin-left:0}
.ldg-shot .ldg-timer__stack .ldg-chip + .ldg-chip{padding-left:22px;
  border-left:1px solid rgba(255,255,255,.16)}
.ldg-chip{display:flex;align-items:center;gap:10px;white-space:nowrap;
  font-size:13.5px;line-height:1.2;color:rgba(255,255,255,.75)}
.ldg-chip__ico{width:22px;display:flex;justify-content:center;flex:0 0 auto}
.ldg-chip__ico svg{width:20px;height:20px;color:var(--ldg-yellow)}
.ldg-chip b{color:var(--ldg-white);font-weight:600}

/* ==========================================================================
   1 · TOP BAR  (unchanged from the light set — the strip carries no photo)
   ========================================================================== */
.ldg-bar{position:relative;width:100%;background:var(--ldg-yellow);color:var(--ldg-ink)}
.ldg-bar__in{position:relative;max-width:1400px;margin:0 auto;min-height:64px;
  display:flex;align-items:center;justify-content:center;gap:26px;padding:8px 56px;flex-wrap:wrap}
.ldg-bar__tag{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;
  padding:5px 12px 5px 10px;border-radius:999px;background:var(--ldg-ink);color:var(--ldg-yellow);
  font-family:var(--ldg-display);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.ldg-bar__tag svg{width:11px;height:11px}
.ldg-bar__msg{font-size:16px;line-height:1.35;margin:0;color:var(--ldg-ink)}
.ldg-bar__msg strong{font-size:18px;font-weight:700}
.ldg-bar__msg .ldg-code{font-weight:700}
.ldg-bar__msg a{color:var(--ldg-ink);opacity:.7;font-size:14px}
.ldg-bar__cta{display:inline-flex;align-items:center;gap:9px;flex:0 0 auto;
  font-size:16px;font-weight:600;color:var(--ldg-ink);text-decoration:none;white-space:nowrap}
.ldg-bar__cta span{border-bottom:1.5px solid transparent;transition:border-color .15s}
.ldg-bar__cta:hover span{border-bottom-color:var(--ldg-ink)}
.ldg-bar__arrow{width:26px;height:26px;border-radius:50%;background:var(--ldg-ink);
  display:grid;place-items:center;flex:0 0 auto}
.ldg-bar__arrow svg{width:13px;height:13px;color:var(--ldg-yellow)}
.ldg-bar .ldg-count{gap:5px}
.ldg-bar .ldg-count__unit{min-width:36px;padding:0;background:none;box-shadow:none}
.ldg-bar .ldg-count__num{font-size:21px;color:var(--ldg-ink)}
.ldg-bar .ldg-count__lab{font-size:9px;margin-top:3px;color:rgba(20,19,19,.62)}
.ldg-bar__sep{font-family:var(--ldg-display);font-size:19px;font-weight:700;opacity:.35;
  line-height:1.1;color:var(--ldg-ink)}
.ldg-bar__close{position:absolute;top:50%;right:16px;transform:translateY(-50%);
  width:26px;height:26px;border:0;border-radius:50%;cursor:pointer;
  background:rgba(20,19,19,.12);color:var(--ldg-ink);display:grid;place-items:center}
.ldg-bar__close:hover{background:rgba(20,19,19,.22)}
.ldg-bar__close svg{width:12px;height:12px}
@media (max-width:1120px){
  .ldg-bar__in{gap:14px;padding:12px 48px}
  .ldg-bar__msg{font-size:14px;text-align:center}
  .ldg-bar__msg strong{font-size:15px}
}
@media (max-width:620px){
  .ldg-bar__in{padding:11px 44px 11px 16px;gap:10px;justify-content:flex-start}
  .ldg-bar .ldg-count,.ldg-bar__tag{display:none}
  .ldg-bar__msg{font-size:13.5px;text-align:left;flex:1 1 auto}
  .ldg-bar__cta{font-size:14px}
  .ldg-bar__cta span{display:none}
}

/* ==========================================================================
   2 · HERO — full-bleed photo
   ========================================================================== */
.ldg-shot{
  position:relative;overflow:hidden;min-height:664px;border-radius:32px;
  background:#1B1D16;color:var(--ldg-white);isolation:isolate;
}
.ldg-shot__bg{
  position:absolute;inset:0;z-index:0;
  background-image:var(--ldg-photo);background-size:cover;background-position:50% 50%;
}
/* panel mode: a blurred copy fills the frame, the sharp photo sits whole on
   the right so nothing important (flag, roofline) is ever cropped away */
.ldg-shot--panel .ldg-shot__bg,.ldg-modal--panel .ldg-shot__bg{
  filter:blur(12px) brightness(.72) saturate(1.05);transform:scale(1.24);
}
/* the box is the photo's own aspect, so nothing is cropped and the mask can
   fade the photo's real left edge into the blurred copy behind it */
.ldg-shot__panel{
  position:absolute;top:0;bottom:0;right:0;left:auto;width:auto;
  aspect-ratio:var(--ldg-panel-ar,508 / 690);z-index:1;pointer-events:none;display:none;
  background-image:var(--ldg-photo);background-repeat:no-repeat;
  background-size:cover;background-position:center;
  -webkit-mask-image:linear-gradient(90deg,transparent 0,rgba(0,0,0,.55) 9%,#000 22%);
  mask-image:linear-gradient(90deg,transparent 0,rgba(0,0,0,.55) 9%,#000 22%);
}
.ldg-shot--panel .ldg-shot__panel,.ldg-modal--panel .ldg-shot__panel{display:block}
/* the base is already dimmed by the filter, so the scrim can stay lighter and
   let the out-of-focus scenery read behind the type */
.ldg-shot--panel .ldg-shot__scrim,.ldg-modal--panel .ldg-shot__scrim{
  background:
    linear-gradient(96deg,rgba(10,12,8,.6) 0%,rgba(10,12,8,.46) 34%,rgba(10,12,8,.22) 60%,rgba(10,12,8,0) 84%),
    linear-gradient(180deg,rgba(10,12,8,0) 55%,rgba(10,12,8,.5) 100%);
}
.ldg-shot__scrim{
  position:absolute;inset:0;z-index:2;
  background:
    linear-gradient(96deg,rgba(10,12,8,.9) 0%,rgba(10,12,8,.76) 30%,rgba(10,12,8,.42) 55%,rgba(10,12,8,.08) 80%,rgba(10,12,8,0) 100%),
    linear-gradient(180deg,rgba(10,12,8,0) 55%,rgba(10,12,8,.55) 100%);
}
.ldg-shot__logo{position:absolute;z-index:5;top:42px;left:60px}
.ldg-shot__logo svg{height:32px;width:auto;color:var(--ldg-yellow)}
.ldg-shot__tag{position:absolute;z-index:5;top:36px;right:44px}
.ldg-shot__in{position:relative;z-index:4;max-width:700px;padding:126px 0 0 60px}
.ldg-shot__h{
  font-family:var(--ldg-display);font-weight:700;text-transform:uppercase;
  font-size:clamp(38px,4.1vw,58px);line-height:1.0;letter-spacing:-.02em;margin:0;
  text-shadow:0 2px 18px rgba(0,0,0,.35);
}
.ldg-shot__sub{
  margin:18px 0 0;max-width:40ch;font-size:18px;line-height:1.5;color:rgba(255,255,255,.84);
  text-shadow:0 1px 12px rgba(0,0,0,.4);
}
.ldg-shot__sub b{color:var(--ldg-white);font-weight:600}
.ldg-shot__actions{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:30px}
.ldg-shot__fine{margin:18px 0 0;max-width:none;white-space:nowrap;
  font-size:12px;line-height:1.6;
  color:rgba(255,255,255,.6);text-shadow:0 1px 10px rgba(0,0,0,.45)}
.ldg-shot__fine a{color:rgba(255,255,255,.75)}
.ldg-shot__fine b{color:var(--ldg-yellow)}
.ldg-shot .ldg-timer{left:24px;right:24px;bottom:22px}

/* ---- tablet ---- */
@media (max-width:1180px){
  .ldg-shot{min-height:0}
  .ldg-shot__in{max-width:none;padding:118px 32px 0}
  .ldg-shot__logo{left:32px}
  .ldg-shot__tag{right:24px;transform:scale(.84);transform-origin:top right}
  .ldg-shot .ldg-timer{position:relative;left:auto;right:auto;bottom:auto;
    margin:30px 24px 24px;flex-wrap:wrap;gap:16px 22px}
  .ldg-timer__rule{display:none}
  .ldg-timer__stack{margin-left:0}
  .ldg-shot .ldg-timer__stack{flex-direction:column;align-items:flex-start;gap:8px}
  .ldg-shot .ldg-timer__stack .ldg-chip + .ldg-chip{padding-left:0;border-left:0}
}

/* ---- phone ---- */
@media (max-width:720px){
  .ldg-shot{border-radius:20px;min-height:0}
  .ldg-shot__bg{background-position:88% 50%}
  /* phone: no side panel — the photo just covers, unblurred */
  .ldg-shot--panel .ldg-shot__bg,.ldg-modal--panel .ldg-shot__bg{filter:none;transform:none}
  .ldg-shot--panel .ldg-shot__panel,.ldg-modal--panel .ldg-shot__panel{display:none}
  .ldg-shot__scrim,
  .ldg-shot--panel .ldg-shot__scrim{
    background:
      linear-gradient(180deg,rgba(10,12,8,.74) 0%,rgba(10,12,8,.6) 44%,rgba(10,12,8,.78) 100%),
      linear-gradient(96deg,rgba(10,12,8,.42) 0%,rgba(10,12,8,.06) 100%);
  }
  .ldg-shot__logo{top:20px;left:20px}
  .ldg-shot__logo svg{height:24px}
  .ldg-shot__tag{top:16px;right:14px;transform:scale(.52);transform-origin:top right}
  .ldg-shot__in{padding:86px 20px 0}
  .ldg-shot__h{font-size:31px;line-height:1.04}
  .ldg-shot__sub{margin-top:12px;font-size:15px;line-height:1.45;max-width:none}
  .ldg-shot__actions{margin-top:20px;gap:10px;align-items:stretch;flex-direction:column}
  .ldg-shot__fine{margin-top:14px;font-size:11px;line-height:1.55;max-width:none;
    white-space:normal}
  .ldg-shot .ldg-timer{margin:20px 12px 12px;padding:14px 14px}
}
@media (max-width:400px){
  .ldg-shot__h{font-size:28px}
  .ldg-shot__in{padding:80px 16px 0}
}

/* phone: pill + arrow stay on one line, coupon takes the next */
@media (max-width:720px){
  .ldg-swap{--ldg-rs:50px;display:flex}
  .ldg-swap .ldg-btn{flex:1 1 auto;padding:15px 20px;font-size:16px}
  .ldg-round svg{width:18px;height:18px}
  .ldg-coupon{width:100%}
  .ldg-coupon__code{flex:1 1 auto;padding:12px 14px;font-size:18px}
}

/* phone: the timer stacks into readable rows */
@media (max-width:720px){
  .ldg-timer{flex-wrap:wrap;gap:12px}
  .ldg-timer__rule{display:none}
  .ldg-timer__lab{width:100%;font-size:11px;letter-spacing:.14em}
  .ldg-timer .ldg-count{width:100%;gap:6px}
  .ldg-count__unit{flex:1 1 0;min-width:0;padding:6px 4px 6px}
  .ldg-count__num{font-size:21px}
  .ldg-count__lab{margin-top:3px;font-size:7.5px;letter-spacing:.08em}
  .ldg-timer__ends{width:100%;font-size:12px}
  /* the deadline reads on one line: the break folds away and the space
     that followed it becomes the gap */
  .ldg-brk{display:none}
  .ldg-modal__box .ldg-timer__ends{white-space:nowrap}
  .ldg-timer__stack,.ldg-shot .ldg-timer__stack{width:100%;margin-left:0;gap:7px;
    flex-direction:column;align-items:flex-start;
    padding-top:11px;border-top:1px solid rgba(255,255,255,.14)}
  .ldg-shot .ldg-timer__stack .ldg-chip + .ldg-chip{padding-left:0;border-left:0}
  .ldg-chip{font-size:12.5px;gap:9px;white-space:normal}
  .ldg-chip__ico{width:18px}
  .ldg-chip__ico svg{width:17px;height:17px}
}

/* ==========================================================================
   3 · EXIT POPUP — full-bleed photo
   ========================================================================== */
.ldg-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;
  background:rgba(10,12,8,.6);backdrop-filter:blur(3px)}
.ldg-modal__box{
  position:relative;width:100%;max-width:980px;min-height:548px;overflow:hidden;
  border-radius:28px;background:#1B1D16;color:var(--ldg-white);
  box-shadow:0 40px 90px rgba(0,0,0,.5);isolation:isolate;
}
/* framed so the whole cabin is in shot */
.ldg-modal .ldg-shot__bg{background-position:60% 50%}
.ldg-modal__logo{position:absolute;z-index:5;top:34px;left:44px}
.ldg-modal__logo svg{height:28px;width:auto;color:var(--ldg-yellow)}
.ldg-modal__tag{position:absolute;z-index:5;top:66px;right:36px;transform:scale(.8);
  transform-origin:top right}
.ldg-modal__in{position:relative;z-index:4;max-width:600px;padding:104px 0 0 44px}
.ldg-modal__h{font-family:var(--ldg-display);font-weight:700;text-transform:uppercase;
  font-size:clamp(32px,3.7vw,47px);line-height:1.0;letter-spacing:-.02em;margin:0;
  text-shadow:0 2px 18px rgba(0,0,0,.35)}
.ldg-modal__sub{margin:16px 0 0;max-width:33ch;font-size:16px;line-height:1.5;
  color:rgba(255,255,255,.84);text-shadow:0 1px 12px rgba(0,0,0,.4)}
.ldg-modal__sub b{color:var(--ldg-white);font-weight:600}
.ldg-modal__row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:26px}
.ldg-modal__fine{margin:16px 0 0;max-width:none;font-size:12px;line-height:1.6;
  color:rgba(255,255,255,.62);text-shadow:0 1px 10px rgba(0,0,0,.45)}
.ldg-modal__fine a{color:rgba(255,255,255,.78)}
/* only the coupon is picked out; scoped, because the top bar also uses
   .ldg-code on a yellow ground where it must stay ink */
.ldg-modal__fine .ldg-code{color:var(--ldg-yellow);font-weight:700;letter-spacing:.02em}
.ldg-modal__close{
  position:absolute;top:18px;right:18px;z-index:6;
  width:34px;height:34px;border:0;border-radius:50%;cursor:pointer;
  background:rgba(255,255,255,.16);color:var(--ldg-white);display:grid;place-items:center;
  backdrop-filter:blur(6px);
}
.ldg-modal__close:hover{background:rgba(255,255,255,.3)}
.ldg-modal__close svg{width:14px;height:14px}
.ldg-modal .ldg-timer{left:20px;right:20px;bottom:18px}
.ldg-modal .ldg-timer__stack{padding-left:20px;border-left:1px solid rgba(255,255,255,.16)}

@media (max-width:900px){
  .ldg-modal{padding:16px}
  .ldg-modal__box{min-height:0}
  .ldg-modal__logo{top:24px;left:24px}
  .ldg-modal__tag{top:62px;right:16px;transform:scale(.66);transform-origin:top right}
  .ldg-modal__in{max-width:none;padding:100px 24px 0}
  .ldg-modal .ldg-timer{position:relative;left:auto;right:auto;bottom:auto;
    margin:24px 16px 16px;flex-wrap:wrap;gap:14px 20px}
  .ldg-modal .ldg-timer__rule{display:none}
  .ldg-modal .ldg-timer__stack{margin-left:0;padding-left:0;border-left:0}
}
@media (max-width:720px){
  .ldg-modal{padding:10px}
  .ldg-modal__box{border-radius:20px}
  .ldg-modal .ldg-shot__bg{background-position:88% 50%}
  .ldg-modal .ldg-shot__scrim,
  .ldg-modal--panel .ldg-shot__scrim{
    background:
      linear-gradient(180deg,rgba(10,12,8,.76) 0%,rgba(10,12,8,.62) 44%,rgba(10,12,8,.8) 100%),
      linear-gradient(96deg,rgba(10,12,8,.42) 0%,rgba(10,12,8,.06) 100%);
  }
  .ldg-modal__logo{top:18px;left:18px}
  .ldg-modal__logo svg{height:23px}
  .ldg-modal__tag{top:14px;right:56px;transform:scale(.5)}
  .ldg-modal__in{padding:78px 18px 0}
  .ldg-modal__h{font-size:29px;line-height:1.05}
  .ldg-modal__sub{margin-top:11px;font-size:13px;line-height:1.45;max-width:none}
  .ldg-modal__row{margin-top:18px;gap:10px;flex-direction:column;align-items:stretch}
  .ldg-modal__fine{margin-top:13px;font-size:11px;max-width:none}
  .ldg-modal .ldg-timer{margin:18px 10px 10px;padding:14px 14px}
  .ldg-modal__close{top:12px;right:12px;width:30px;height:30px}
}

/* ==========================================================================
   FRENCH (CA_FR) TYPE OVERRIDES
   Lifted from the Québec design file. French copy runs ~25% longer than the
   English, so the headline steps down, the sub-head gets more measure and the
   timer tightens up to keep everything on the same number of lines.
   ========================================================================== */
.ldg-modal[data-ldg-variant="CA_FR"] .ldg-modal__h{font-size:clamp(30px,3.2vw,40px)}
.ldg-modal[data-ldg-variant="CA_FR"] .ldg-modal__sub{max-width:40ch}
.ldg-modal[data-ldg-variant="CA_FR"] .ldg-timer{gap:16px;padding:15px 22px 15px 20px}
.ldg-modal[data-ldg-variant="CA_FR"] .ldg-timer{left:16px;right:16px;bottom:18px}
@media (max-width:720px){[data-ldg-variant="CA_FR"] .ldg-hide-sm{display:none}}

/* ==========================================================================
   INJECTION HARDENING
   Zero-specificity reset so UA styles inside the shadow tree (button fonts,
   <p> and <h2> margins) can never show through. :where() carries no weight,
   so every rule above still wins.
   ========================================================================== */
:where(#ldgModal, #ldgModal *, #ldgBar, #ldgBar *){
  box-sizing:border-box;margin:0;padding:0;min-width:0;border:0;outline:0;
  background:none;box-shadow:none;border-radius:0;float:none;
  font:inherit;color:inherit;text-align:left;text-decoration:none;
  text-transform:none;letter-spacing:inherit;line-height:inherit;
  list-style:none;vertical-align:baseline;
}
:where(#ldgModal button, #ldgBar button){cursor:pointer}
:where(#ldgModal svg, #ldgBar svg){display:block;flex:0 0 auto}
#ldgModal .ldg-modal__fine a,#ldgModal .ldg-timer a,#ldgBar .ldg-bar__msg a{text-decoration:underline}

/* --- text colour, pinned down ------------------------------------------
   The design set gives .ldg-modal__box  color:var(--ldg-white)  and lets the
   headline, sub-head and fine print inherit it. That is fine until the custom
   property fails to resolve for any reason — an unresolved var() makes the
   declaration invalid at computed-value time, and 'color' then falls back to
   INHERITED, which inside this sandbox means the host's initial black. The
   result is a black headline on a dark photo: invisible. Same story for the
   bar's ink on yellow. So state the colours outright, with literal fallbacks,
   and stop depending on inheritance for the one thing that must be readable. */
#ldgModal .ldg-modal__box{color:var(--ldg-white,#FFFFFF)}
#ldgModal .ldg-modal__h{color:var(--ldg-white,#FFFFFF)}
#ldgModal .ldg-modal__sub{color:rgba(255,255,255,.84)}
#ldgModal .ldg-timer__lab,#ldgModal .ldg-chip{color:rgba(255,255,255,.72)}
#ldgModal .ldg-count__num{color:var(--ldg-yellow,#FFF65B)}
#ldgBar .ldg-bar,#ldgBar .ldg-bar__msg,#ldgBar .ldg-bar__cta{color:var(--ldg-ink,#141313)}
#ldgBar .ldg-bar__tag{color:var(--ldg-yellow,#FFF65B)}

/* The bar is injected as a fixed strip, so it carries its own edge. */
.ldg-bar{box-shadow:0 1px 0 rgba(20,19,19,.09),0 6px 18px rgba(20,19,19,.06)}

/* The design set's <=620px block hides every <span> inside the CTA:
     .ldg-bar__cta span{display:none}
   .ldg-bar__arrow is itself a <span>, so the arrow goes with the label and
   the bar is left with no tappable CTA at all on a phone. Put the arrow back
   — the compact, label-less button that rule was reaching for. */
@media (max-width:620px){
  .ldg-bar__cta .ldg-bar__arrow{display:grid}
}

/* --- keeping the strip to two rows -------------------------------------
   The three variants run to different lengths, so each gets its own wrap
   point, measured rather than guessed: one line holds down to 1280px in US
   English, 1320px for the longer "Labour Day" copy, and 1360px in French.
   Below its own threshold the strip becomes two tidy rows — the message,
   then the CTA and the clock side by side — instead of wrapping into three
   ragged ones. The design's own <=620px rules take over from there. */
@media (min-width:621px) and (max-width:1279px){
  .ldg-bar[data-ldg-variant="US"] .ldg-bar__in{gap:8px 22px;padding:11px 52px}
  .ldg-bar[data-ldg-variant="US"] .ldg-bar__tag{display:none}
  .ldg-bar[data-ldg-variant="US"] .ldg-bar__msg{flex:0 0 100%;text-align:center}
}
@media (min-width:621px) and (max-width:1319px){
  .ldg-bar[data-ldg-variant="CA_EN"] .ldg-bar__in{gap:8px 22px;padding:11px 52px}
  .ldg-bar[data-ldg-variant="CA_EN"] .ldg-bar__tag{display:none}
  .ldg-bar[data-ldg-variant="CA_EN"] .ldg-bar__msg{flex:0 0 100%;text-align:center}
}
@media (min-width:621px) and (max-width:1359px){
  .ldg-bar[data-ldg-variant="CA_FR"] .ldg-bar__in{gap:8px 22px;padding:11px 52px}
  .ldg-bar[data-ldg-variant="CA_FR"] .ldg-bar__tag{display:none}
  .ldg-bar[data-ldg-variant="CA_FR"] .ldg-bar__msg{flex:0 0 100%;text-align:center}
}
@media (prefers-reduced-motion:reduce){
  #ldgBar *,#ldgModal *{transition:none !important;animation:none !important}
}
`;

/* =====================================================================
     5 · Small helpers
     ===================================================================== */
  var END = new Date(CONFIG.deadline).getTime();
  var qs  = new URLSearchParams(window.location.search);

  function ls(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) {}
    return null;
  }
  function lsDel(key) { try { window.localStorage.removeItem(key); } catch (e) {} }

  function expired() { return Date.now() >= END; }

  function scrollY() {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  var REDUCE = false;
  try { REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* A dismissal that lapses after N hours. localStorage, with an in-memory
     fallback for private mode / blocked storage. */
  var memDismiss = {};
  function dismissedFor(key) {
    if (memDismiss[key] && memDismiss[key] > Date.now()) return true;
    var until = parseInt(ls(key) || '0', 10);
    return !!until && until > Date.now();
  }
  function dismissFor(key, hours) {
    var until = Date.now() + hours * 36e5;
    memDismiss[key] = until;
    ls(key, String(until));
  }

  /* ---------------------------------------------------------------------
     Web Animations, not CSS transitions.
     A transition has to be written to the element's inline `transition`
     property. On a host-page element (a nav, <body>) that would clobber
     whatever transition the site already had there, and restoring it later
     is guesswork. el.animate() composites on top instead and touches no
     inline style at all: the caller writes the FINAL value to the element,
     then animates from the old one to it.
     --------------------------------------------------------------------- */
  function animate(el, from, to, ms, easing) {
    if (!ms || !el.animate) return null;
    try { return el.animate([from, to], { duration: ms, easing: easing, fill: 'none' }); }
    catch (e) { return null; }
  }

  /* ---------------------------------------------------------------------
     Shadow-DOM sandbox. The markup and the stylesheet live inside a shadow
     tree, so none of the popup's or the bar's CSS can match anything on the
     host page, and none of the host page's CSS can match anything inside.
     `all:initial` on the host element stops blanket site rules (`div{...}`,
     `body > *{...}`, `*{...}`) from reaching it and gives the shadow tree a
     known set of inherited values to start from.
     --------------------------------------------------------------------- */
  var fallbackCssAdded = false;
  function sandbox(id, markup, hostStyle, css) {
    var host = document.createElement('div');
    host.id = id;
    host.setAttribute('style', 'all:initial;' + (hostStyle || ''));

    var root = null;
    if (host.attachShadow) {
      try { root = host.attachShadow({ mode: 'open' }); } catch (e) { root = null; }
    }

    var tmp = document.createElement('div');
    tmp.innerHTML = markup;
    var el = tmp.firstElementChild;

    if (root) {
      var style = document.createElement('style');
      style.textContent = css.replace('__LDG_ROOT__', ':host');
      root.appendChild(style);
      root.appendChild(el);
    } else {
      // No Shadow DOM (pre-2018 browsers): one shared sheet in <head>. Every
      // selector there is either .ldg-* prefixed or scoped to #ldgModal /
      // #ldgBar, so the blast radius stays small.
      if (!fallbackCssAdded) {
        var shared = document.createElement('style');
        shared.id = 'ldg-css';
        shared.textContent = css.replace('__LDG_ROOT__', ':root');
        document.head.appendChild(shared);
        fallbackCssAdded = true;
      }
      host.appendChild(el);
    }
    return { host: host, root: root, el: el };
  }

  /* The stylesheet with this variant's artwork baked in.

     The replacement is a FUNCTION, not a string: in String.replace a literal
     replacement treats $&, $`, $' and $1 as substitution patterns, so a URL
     that happened to contain a $ would be silently mangled. Returning the
     value from a function passes it through untouched. */
  function cssFor(variant) {
    var art = CONFIG.art[variant] || {};
    return CSS
      .replace('__LDG_PHOTO__', function () { return art.photo || ''; })
      .replace('__LDG_TAG__',   function () { return art.tag   || ''; });
  }

  /* A bare filename in CONFIG.art resolves against the PAGE, not this script,
     so it would 404 on every page but the site root. Say so once, loudly, in
     the console rather than leaving someone to wonder why the popup is grey. */
  function checkArt(variant) {
    var art = CONFIG.art[variant] || {};
    ['photo', 'tag'].forEach(function (k) {
      var v = art[k];
      if (!v || /^(https?:)?\/\//.test(v) || v.indexOf('data:') === 0) return;
      if (window.console && console.warn) {
        console.warn('[ldg] CONFIG.art.' + variant + '.' + k + ' is "' + v +
          '" — that resolves against the page, not this script. Use an absolute URL.');
      }
    });
  }

  /* The handful of strings the script writes at runtime rather than reading
     out of the markup. Everything else visible is in the MARKUP block. */
  var COPY = {
    US:    { copied: 'Copied!', failed: 'Copy failed',        aria: 'Copy coupon code ' },
    CA_EN: { copied: 'Copied!', failed: 'Copy failed',        aria: 'Copy coupon code ' },
    CA_FR: { copied: 'Copié\u00a0!', failed: 'Échec de la copie', aria: 'Copier le code promo ' }
  };

  /* One countdown driver, shared by the popup and the bar. Writes into every
     [data-unit] element inside `scope`. */
  function countdown(scope, onExpire) {
    var timer = null;
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    function set(u, v) {
      var el = scope.querySelector('[data-unit="' + u + '"]');
      if (el && el.textContent !== v) el.textContent = v;
    }
    function tick() {
      if (expired()) { stop(); if (onExpire) onExpire(); return; }
      var s = Math.floor((END - Date.now()) / 1000);
      set('days',    pad(Math.floor(s / 86400)));
      set('hours',   pad(Math.floor((s % 86400) / 3600)));
      set('minutes', pad(Math.floor((s % 3600) / 60)));
      set('seconds', pad(s % 60));
    }
    function start() { tick(); if (!timer) timer = setInterval(tick, 1000); }
    function stop()  { if (timer) { clearInterval(timer); timer = null; } }
    return { start: start, stop: stop };
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* =====================================================================
     6 · Geo + language detection
     ===================================================================== */
  function cachedCountry() {
    try {
      var o = JSON.parse(ls(CONFIG.geoKey) || 'null');
      return (o && (Date.now() - o.t < CONFIG.geoTTL)) ? o.c : null;
    } catch (e) { return null; }
  }

  function applyCountry(c) {
    if (CONFIG.setHtmlAttr) {
      document.documentElement.setAttribute('data-country', c);
      if (c === 'US') document.documentElement.classList.add('is-us');
    }
    return c;
  }

  function resolveCountry() {
    // QA override wins over everything
    var forced = (qs.get('ldgeo') || '').toUpperCase();
    if (/^[A-Z]{2}$/.test(forced)) return Promise.resolve(applyCountry(forced));

    var hit = cachedCountry();
    if (hit) return Promise.resolve(applyCountry(hit));

    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, CONFIG.geoTimeout);

    return fetch(CONFIG.geoEndpoint, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.text(); })
      .then(function (t) {
        clearTimeout(timer);
        var c = (t.match(/loc=([A-Z]{2})/) || [])[1] || 'XX';
        ls(CONFIG.geoKey, JSON.stringify({ c: c, t: Date.now() }));
        return applyCountry(c);
      })
      .catch(function () { clearTimeout(timer); return applyCountry('XX'); });
  }

  /* Which language is this page in? <html lang> is authoritative on Webflow's
     localized pages; the /fr/ path prefix is the fallback for anything served
     without it. ?ldlang= overrides both, for QA. */
  function isFrench() {
    var forced = qs.get('ldlang');
    if (forced) return CONFIG.frenchLang.test(forced);
    var lang = (document.documentElement.getAttribute('lang') || '').trim();
    if (lang) return CONFIG.frenchLang.test(lang);
    return CONFIG.frenchPath.test(window.location.pathname);
  }

  /* Country + language collapse into one of three variants, or nothing.
       US visitor              -> US
       Canadian on an EN page  -> CA_EN
       Canadian on a FR page   -> CA_FR   */
  function variantFor(country) {
    if (country === 'US') return 'US';
    if (country === 'CA') return isFrench() ? 'CA_FR' : 'CA_EN';
    return null;
  }

/* =====================================================================
     7 · Render + wire up
     ===================================================================== */
  function mount(variant) {
    var P = CONFIG.popup;
    if (!P.enabled || !MODAL[variant]) return;
    if (expired()) return;
    if (dismissedFor(P.dismissKey) && qs.get('ldexit') !== '1') return;
    if (document.getElementById('ldg-exit-intent')) return;

    // Isolated shadow tree — see sandbox() in section 5. The only thing this
    // popup touches on the host page is the scroll lock below, and that is an
    // inline style restored byte-exact on close.
    var box   = sandbox('ldg-exit-intent', MODAL[variant], '', cssFor(variant));
    var root  = box.root;
    var modal = box.el;
    var copy  = COPY[variant];
    document.body.appendChild(box.host);

    // Focus lives inside the shadow tree, so document.activeElement would
    // only ever report the host element. Query the shadow root instead.
    function activeEl() { return (root || document).activeElement; }

    // ---- scroll lock (the one deliberate touch on the host page) ----
    var scrollLocked = false, prevOverflow = '', prevPriority = '';
    function setScrollLock(on) {
      if (!P.lockScroll) return;
      var el = document.documentElement;
      if (on && !scrollLocked) {
        prevOverflow = el.style.getPropertyValue('overflow');
        prevPriority = el.style.getPropertyPriority('overflow');
        el.style.setProperty('overflow', 'hidden', 'important');
        scrollLocked = true;
      } else if (!on && scrollLocked) {
        el.style.removeProperty('overflow');
        if (prevOverflow) el.style.setProperty('overflow', prevOverflow, prevPriority);
        scrollLocked = false;
      }
    }

    // ---- countdown ----
    var clock = countdown(modal, function () { close(true); });

    // ---- open / close ----
    var lastFocus = null;
    var isOpen = false;

    function open() {
      if (isOpen || dismissedFor(P.dismissKey) || expired()) return;
      isOpen = true;
      lastFocus = document.activeElement;
      clock.start();
      modal.classList.remove('ldg-hide');
      setScrollLock(true);
      var focusable = modal.querySelector('.ldg-modal__close');
      if (focusable) focusable.focus();
      disarm();
    }

    function close(silent) {
      isOpen = false;
      modal.classList.add('ldg-hide');
      clock.stop();
      setScrollLock(false);
      if (!silent) {
        dismissFor(P.dismissKey, P.dismissHours);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }
      disarm();
    }

    modal.addEventListener('click', function (e) {
      if (e.target === modal) { close(); return; }              // backdrop
      if (e.target.closest('[data-ldg-dismiss]')) close();      // X button
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) close();
    });

    // keep focus inside the dialog while it's open
    modal.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !isOpen) return;
      var items = modal.querySelectorAll('a[href], button:not([disabled])');
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      var here = activeEl();
      if (e.shiftKey && here === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && here === last) { e.preventDefault(); first.focus(); }
    });

    // ---- copy the coupon code ----
    var copyTimers = new WeakMap();
    modal.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ldg-copy]');
      if (!btn) return;
      var label = btn.querySelector('[data-ldg-copy-label]');
      var code  = btn.getAttribute('data-ldg-copy');
      var flash = function (msg) {
        if (!label) return;
        clearTimeout(copyTimers.get(btn));
        label.textContent = msg;
        btn.setAttribute('aria-label', msg === code ? copy.aria + code : msg);
        copyTimers.set(btn, setTimeout(function () {
          label.textContent = code;
          btn.setAttribute('aria-label', copy.aria + code);
        }, 1600));
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(
          function () { flash(copy.copied); },
          function () { flash(copy.failed); }
        );
      } else {
        flash(copy.failed);
      }
    });

    /* ===================================================================
       8 · Triggers
       CONFIG.popup.trigger picks between them: 'timeout' (the design set's
       6-second delay), 'exit' (cursor leaving via the top of the viewport on
       desktop, a fast upward flick on touch), or 'both' — whichever fires
       first. Whatever opens it, disarm() tears the others down.
       =================================================================== */
    var armed = false;
    var listeners = [];
    var cleanups = [];

    function on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      listeners.push([target, type, fn, opts]);
    }
    function disarm() {
      armed = false;
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      cleanups.forEach(function (fn) { fn(); });
      listeners = [];
      cleanups = [];
    }

    function onMouseOut(e) {
      if (!armed) return;
      // Cursor left through the top edge and not into another element.
      if (e.clientY > 0) return;
      if (e.relatedTarget || e.toElement) return;
      open();
    }

    function armScrollUp() {
      var lastY = window.scrollY, lastT = Date.now();
      on(window, 'scroll', function () {
        if (!armed) return;
        var y = window.scrollY, t = Date.now(), dt = (t - lastT) / 1000;
        if (dt > 0) {
          var v = (lastY - y) / dt;                  // positive = scrolling up
          if (v > P.scrollUpVelocity && y < 320) open();
        }
        lastY = y; lastT = t;
      }, { passive: true });
    }

    function armExitIntent() {
      if (dismissedFor(P.dismissKey) || expired()) return;
      armed = true;

      var touch = window.matchMedia('(hover: none)').matches;
      if (!touch) {
        on(document, 'mouseout', onMouseOut);
      } else if (P.mobileTrigger === 'scrollUp') {
        armScrollUp();
      } else if (P.mobileTrigger === 'timeout') {
        var to = setTimeout(function () { if (armed) open(); }, P.mobileTimeout);
        on(window, 'pagehide', function () { clearTimeout(to); });
        cleanups.push(function () { clearTimeout(to); });
      }
    }

    if (qs.get('ldexit') === '1') { open(); return; }

    if (P.trigger === 'timeout' || P.trigger === 'both') {
      var wait = setTimeout(open, P.delay);
      cleanups.push(function () { clearTimeout(wait); });
    }
    if (P.trigger === 'exit' || P.trigger === 'both') {
      setTimeout(armExitIntent, P.armDelay);
    }
  }

  /* =====================================================================
     9 · STICKY TOP BAR

     WHY IT IS FIXED, AND NOT INSERTED AT THE TOP OF <body>
     A script that runs after the page has rendered cannot make itself the
     first thing in the document flow without reordering the site's own DOM,
     and even if it did, a position:fixed or sticky header — which is what a
     Webflow navbar usually is — ignores document flow entirely and would sit
     on top of the bar anyway. So the bar is fixed, and room for it is made
     explicitly, in three places at once:

       <body> padding-top      →  everything in normal document flow
       top: <h> on pinned els  →  everything that ignores flow (fixed/sticky
                                  headers, sticky sub-navs, sticky tables)
       --ldg-bar-h on <html>   →  anything sized against the viewport, e.g.
                                  .hero{min-height:calc(100vh - var(--ldg-bar-h,0px))}

     All three animate on the same curve and duration as the bar's own slide,
     so the page opens for it in one motion instead of jumping. Every value is
     recorded before it is touched and put back byte-exact when the bar goes,
     so the page ends up in precisely the state it started in.
     ===================================================================== */
  function mountBar(variant) {
    var B = CONFIG.bar;
    if (!B.enabled || !BAR[variant]) return;
    if (expired()) return;
    if (document.getElementById('ldg-promo-bar')) return;
    if (dismissedFor(B.dismissKey) && qs.get('ldbar') !== '1') return;

    var ANIM = REDUCE ? 0 : B.animMs;
    var EASE = B.easing;

    checkArt(variant);

    var box  = sandbox('ldg-promo-bar', BAR[variant],
      'position:fixed;top:0;left:0;right:0;display:none;z-index:' + B.zIndex + ';' +
      'transform:translateY(-100%);opacity:0;will-change:transform,opacity',
      cssFor(variant));
    var host = box.host, bar = box.el;
    document.body.appendChild(host);

    var clock = countdown(bar, function () { hide(true); });

    /* ---- every host-page inline style we touch, so we can put it back ---- */
    var touched = [];
    function setProp(el, prop, value) {
      var i;
      for (i = 0; i < touched.length; i++) {
        if (touched[i][0] === el && touched[i][1] === prop) break;
      }
      if (i === touched.length) {
        touched.push([el, prop, el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]);
      }
      el.style.setProperty(prop, value);
    }
    function restoreAll() {
      touched.forEach(function (t) {
        t[0].style.removeProperty(t[1]);
        if (t[2]) t[0].style.setProperty(t[1], t[2], t[3]);
      });
      touched = [];
    }

    /* Each element's untouched starting value, remembered from the first read.
       Re-reading later would return whatever the running animation is showing
       at that instant, which is exactly what we want as an animation's FROM
       value and exactly what we must not use as a base. */
    var bases = [];
    function baseFor(el, prop) {
      for (var i = 0; i < bases.length; i++) {
        if (bases[i][0] === el && bases[i][1] === prop) return bases[i][2];
      }
      var v = parseFloat(window.getComputedStyle(el).getPropertyValue(prop));
      if (isNaN(v)) v = 0;
      bases.push([el, prop, v]);
      return v;
    }
    function nowAt(el, prop) {
      var v = parseFloat(window.getComputedStyle(el).getPropertyValue(prop));
      return isNaN(v) ? 0 : v;
    }

    /* ---- what has to move out from under the bar ------------------------
       A bounded candidate set, not a getComputedStyle sweep of the whole
       document: the elements that end up under a top bar are the ones pinned
       to the top of the viewport, and those are always either a header-ish
       element or a direct child of <body>. */
    var PINNED_HINTS = 'header,nav,[role="banner"],[class*="nav"],[class*="head"],' +
                       '[class*="topbar"],[class*="top-bar"],[class*="sticky"],' +
                       '[data-sticky]';

    var pinned = [];   // fixed / sticky and anchored to the top → animate `top`
    var flowed = [];   // opted in by attribute, in normal flow  → `margin-top`

    function scanTargets() {
      pinned = []; flowed = [];
      var explicit = document.querySelectorAll(B.pushSelector);
      var cand = [], seen = [], i;
      function add(list) { for (var j = 0; j < list.length; j++) cand.push(list[j]); }

      add(explicit);
      if (B.autoPush) {
        add(document.querySelectorAll(PINNED_HINTS));
        add(document.body.children);
      }

      var rows = [];
      for (i = 0; i < cand.length; i++) {
        var el = cand[i];
        if (!el || el.nodeType !== 1) continue;
        if (el === host || el.id === 'ldg-exit-intent' || el.contains(host)) continue;
        if (seen.indexOf(el) !== -1) continue;
        seen.push(el);

        var cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;

        var rect = el.getBoundingClientRect();
        var pin  = (cs.position === 'fixed' || cs.position === 'sticky');
        rows.push({
          el:      el,
          pin:     pin,
          sticky:  cs.position === 'sticky',
          // 'top:auto' reads as NaN, which is how bottom-anchored things
          // (a cookie bar, a chat bubble) exclude themselves.
          // Only read a base `top` off something that is actually pinned: a
          // static element's `top` is meaningless, and caching it now would
          // poison the base if the element is pinned later on.
          top:     pin ? baseFor(el, 'top') : NaN,
          rectTop: rect.top,
          h:       rect.height,
          optIn:   Array.prototype.indexOf.call(explicit, el) !== -1
        });
      }

      /* Is this element pinned to the VIEWPORT, or to something inside the
         page? A sticky element sticks to its nearest scrolling ancestor, so
         the sticky header of a table inside a scrollable panel — an embedded
         product demo, say — has nothing to do with the top of the window and
         must be left exactly where it is. */
      function pinnedToViewport(el) {
        var n = el.parentElement;
        while (n && n !== document.body && n !== document.documentElement) {
          var cs = window.getComputedStyle(n);
          if (cs.overflow !== 'visible' || cs.overflowY !== 'visible') return false;
          n = n.parentElement;
        }
        return true;
      }

      function chrome(r) {
        if (!r.pin || isNaN(r.top)) return false;
        // Zero-height (a collapsed or measuring node) or full-viewport (an open
        // menu, a lightbox) — neither is page chrome.
        if (r.h <= 0 || r.h > window.innerHeight * 0.8) return false;
        if (r.sticky) return pinnedToViewport(r.el);
        // A fixed element counts only if `top` is actually what places it. If
        // its rect says otherwise it sits inside a transformed ancestor and is
        // not really viewport-fixed at all. Compared against its CURRENT top,
        // not its base: a re-scan can land mid-animation (scroll down and back
        // up inside one animation frame budget), and there the two agree.
        return Math.abs(r.rectTop - nowAt(r.el, 'top')) <= 2;
      }

      // Pass 1 · what is pinned to the very top, and how far down does that
      // band of chrome reach?
      var stack = 0;
      rows.forEach(function (r) {
        if (chrome(r) && r.top <= 4) stack = Math.max(stack, r.top + r.h);
      });

      // Pass 2 · everything pinned at or inside that band moves with it — so a
      // sticky sub-nav parked under a fixed header stays parked under it, and
      // a fixed chat bubble halfway down the viewport is left alone.
      rows.forEach(function (r) {
        if (chrome(r) && r.top <= stack + 4) { pinned.push(r.el); return; }
        /* An opt-in that lives in normal flow only needs its own margin when
           autoPush is OFF. With autoPush ON, <body> padding has ALREADY moved
           everything in flow, and moving it again would shift it by twice the
           bar's height — which is exactly what happens on a page still carrying
           promo-banner="push-down" attributes from the older banner script. */
        if (r.optIn && !B.autoPush) flowed.push(r.el);
      });
    }

    /* ---- open the page up by `px`, on the bar's own curve ---- */
    function applyOffset(px, ms) {
      var body = document.body, de = document.documentElement;

      // 1 · normal document flow. Skipped when autoPush is off — that mode
      //     moves only the elements the page has tagged by hand.
      if (B.autoPush) {
        var pad = baseFor(body, 'padding-top') + px;
        var was = nowAt(body, 'padding-top');
        setProp(body, 'padding-top', pad + 'px');
        animate(body, { paddingTop: was + 'px' }, { paddingTop: pad + 'px' }, ms, EASE);
      }

      // 2 · anything pinned to the top of the viewport
      pinned.forEach(function (el) {
        var to = baseFor(el, 'top') + px, from = nowAt(el, 'top');
        setProp(el, 'top', to + 'px');
        animate(el, { top: from + 'px' }, { top: to + 'px' }, ms, EASE);
      });

      // 3 · explicit opt-ins sitting in normal flow
      flowed.forEach(function (el) {
        var to = baseFor(el, 'margin-top') + px, from = nowAt(el, 'margin-top');
        setProp(el, 'margin-top', to + 'px');
        animate(el, { marginTop: from + 'px' }, { marginTop: to + 'px' }, ms, EASE);
      });

      // 4 · viewport-sized sections, and in-page anchor links
      setProp(de, B.cssVar, px + 'px');
      setProp(de, 'scroll-padding-top', px + 'px');
    }

    /* ---- show / hide ---- */
    var visible = false;
    var gone    = false;     // dismissed or expired: never comes back
    var settle  = null;

    function show() {
      if (visible || gone) return;
      visible = true;
      clearTimeout(settle);

      host.style.display = 'block';    // still translated off-screen + transparent
      scanTargets();
      var h = Math.round(host.getBoundingClientRect().height);

      host.style.transform = 'translateY(0)';
      host.style.opacity   = '1';
      animate(host, { transform: 'translateY(-100%)', opacity: 0 },
                    { transform: 'translateY(0)',     opacity: 1 }, ANIM, EASE);
      applyOffset(h, ANIM);

      // Only reachable with hideOnScroll off: hold the reading position
      // instead of shoving whatever the visitor is reading down the screen.
      if (!B.hideOnScroll && scrollY() > 0) window.scrollBy(0, h);

      startResync();
      clock.start();
    }

    function hide(permanent) {
      if (permanent) gone = true;
      if (!visible) { if (permanent) teardown(); return; }
      visible = false;
      clearTimeout(settle);
      stopResync();

      host.style.transform = 'translateY(-100%)';
      host.style.opacity   = '0';
      animate(host, { transform: 'translateY(0)',     opacity: 1 },
                    { transform: 'translateY(-100%)', opacity: 0 }, ANIM, EASE);
      applyOffset(0, ANIM);

      settle = setTimeout(function () {
        if (visible) return;           // scrolled back up mid-animation
        host.style.display = 'none';
        restoreAll();                  // page is byte-exact again
        clock.stop();
        if (gone) teardown();
      }, ANIM + 60);
    }

    function teardown() {
      clock.stop();
      clearTimeout(settle);
      stopResync();
      window.removeEventListener('load', resync);
      restoreAll();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (ro) { try { ro.disconnect(); } catch (e) {} }
      if (host.parentNode) host.parentNode.removeChild(host);
    }

    /* ---- keep the offset honest -----------------------------------------
       The bar's height is not a constant: it wraps at narrow widths, and it
       grows the moment the web font swaps in. A ResizeObserver catches both,
       plus anything else that changes it, which a resize listener alone does
       not. Corrections are applied instantly — they are not a movement. */
    function remeasure() {
      if (!visible) return;
      applyOffset(Math.round(host.getBoundingClientRect().height), 0);
    }

    /* ---- re-scan as the page settles -------------------------------------
       The page is not finished when we mount. A Webflow navbar is very often
       static markup that the site's own script turns into position:fixed a
       beat later — and our offsets are applied once, at show(). If an element
       becomes pinned after that moment, nothing ever moves it and it lands on
       top of the bar: the page content is pushed down correctly, the nav is
       not. So re-scan at a few settle points instead of trusting the first
       measurement. Corrections are instant, not animated — a nav that has
       only just appeared should not slide.

       scanTargets() is a bounded getComputedStyle pass over header-ish
       elements and <body>'s children, so this costs microseconds, and it
       stops as soon as the bar is hidden or torn down. */
    var RESYNC_AT = [120, 400, 1000, 2500, 5000];
    var resyncTimers = [];
    function resync() {
      if (!visible) return;
      scanTargets();
      remeasure();
    }
    function startResync() {
      stopResync();
      RESYNC_AT.forEach(function (ms) { resyncTimers.push(setTimeout(resync, ms)); });
    }
    function stopResync() {
      resyncTimers.forEach(function (t) { clearTimeout(t); });
      resyncTimers = [];
    }
    window.addEventListener('load', resync);
    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(remeasure);
      try { ro.observe(host); } catch (e) { ro = null; }
    }
    function onResize() {
      if (!visible) return;
      scanTargets();          // a nav can be static on mobile and fixed on desktop
      remeasure();
    }
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(resync).catch(function () {});
    }

    /* requestAnimationFrame never fires in a background tab, so a page opened
       in one would mount the bar and leave it hidden until something else
       woke it. Catch the moment the tab is looked at. */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      if (visible) { resync(); return; }
      if (!gone && (!B.hideOnScroll || scrollY() <= B.showAtPx)) show();
    });

    /* ---- scroll: retract on the way down, return at the very top ---- */
    function onScroll() {
      if (gone || !B.hideOnScroll) return;
      var y = scrollY();
      if (y <= B.showAtPx)      show();
      else if (y >= B.hideAtPx) hide(false);
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---- dismiss ---- */
    bar.addEventListener('click', function (e) {
      if (!e.target.closest('[data-ldg-dismiss="bar"]')) return;
      e.preventDefault();
      dismissFor(B.dismissKey, B.dismissHours);
      hide(true);
    });

    /* ---- entry ----------------------------------------------------------
       If the visitor landed already scrolled, the bar stays out of the way
       and nothing on the page moves at all — no layout shift chasing someone
       who is already reading. It slides in the moment they return to the top. */
    if (B.hideOnScroll && scrollY() > B.hideAtPx) return;
    requestAnimationFrame(function () { show(); });
  }

    /* =====================================================================
     10 · Boot
     ===================================================================== */
  if (qs.get('ldreset') === '1') {
    lsDel(CONFIG.popup.dismissKey);
    lsDel(CONFIG.bar.dismissKey);
    lsDel(CONFIG.geoKey);
  }

  if (expired()) return;

  resolveCountry().then(function (country) {
    var variant = variantFor(country);
    if (!variant) return;                       // outside the campaign
    ready(function () {
      // The two surfaces are independent: dismissing one never affects the
      // other, and each is gated by its own flag.
      mountBar(variant);
      mount(variant);
    });
  });
})();
