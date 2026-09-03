/*!
 * ==========================================================================
 * LODGIFY — Labor / Labour Day / Fete du Travail 2026
 * Geo + language targeted TOP BAR and EXIT-INTENT POPUP
 * ==========================================================================
 * One self-contained file. Nothing else to add to the page.
 *
 *   <script src="https://esoch-lodgify.github.io/am-exit-popups/script.js" defer></script>
 *
 * Drop it anywhere in <body> (or Webflow's "Before </body>" slot). It waits
 * for DOM ready on its own, so <head> works too.
 *
 * WHO SEES WHAT
 *   United States            -> US bar + US popup
 *   Canada, English pages    -> CA-EN bar + CA-EN popup
 *   Canada, French pages     -> CA-FR bar + CA-FR popup
 *   Everywhere else          -> nothing renders at all
 *
 * >> BEFORE THIS GOES LIVE, CHECK ONE THING <<
 *   CONFIG.lang.frPath / frHost decide what counts as a French page. The
 *   defaults assume lodgify.com/fr/... or fr.lodgify.com. If the French site
 *   lives somewhere else, fix those two regexes — nothing else changes.
 *   Test with ?ldlang=fr before trusting it.
 *
 * ARTWORK
 *   Four files, referenced from CONFIG.assetBase. Upload them next to this
 *   script. They total ~360 KB, far too much to inline.
 *     photo-us.jpg  tag-us.png  photo-ca.jpg  tag-ca.png
 *
 * QA HELPERS (query string, no code changes needed)
 *   ?ldgeo=CA      force a country
 *   ?ldlang=fr     force a language
 *   ?ldgeo=GB      force a country with no campaign (should render nothing)
 *   ?ldexit=1      open the popup immediately, skip the exit trigger
 *   ?ldreset=1     clear the dismissed flags and the cached country
 *
 * COPY AND DATES
 *   The visible strings ("11:59 PM PT", "Ends Tue, September 8", the French
 *   equivalents) are plain text inside MARKUP. CONFIG.deadline drives the
 *   countdown and the auto-hide. Change both together or they will disagree.
 * ==========================================================================
 */

(function () {
  'use strict';

  /* =====================================================================
     1 · CONFIG
     ===================================================================== */
  var CONFIG = {
    // Where the four artwork files live. Trailing slash required.
    assetBase: 'https://esoch-lodgify.github.io/am-exit-popups/',

    // Offer deadline. ISO 8601 with an explicit offset, so it is the same
    // instant for everyone regardless of their local clock.
    // 11:59:59 PM Pacific on Sept 8 2026 (PDT = UTC-7).
    deadline: '2026-09-08T23:59:59-07:00',

    // Countries that get a campaign. Anything else sees nothing.
    countries: ['US', 'CA'],

    // --- how a French page is recognised ---
    // Checked in this order: URL path, then hostname, then <html lang>.
    lang: {
      frPath: /^\/fr(\/|$)/i,
      frHost: /^fr\./i,
      useHtmlLang: true
    },

    // --- geo ---
    geoKey: 'geo_country',   // shared with the snippet already on the site
    geoTTL: 864e5,           // 24h
    geoEndpoint: 'https://www.cloudflare.com/cdn-cgi/trace',
    geoTimeout: 2500,
    setHtmlAttr: true,       // mirror onto <html data-country="..">

    // --- top bar ---
    showBar: true,
    barMode: 'flow',         // 'flow' | 'sticky' | 'fixed'
    barDismissDays: 3,       // localStorage, per the source design

    // --- exit popup ---
    showPopup: true,
    armDelay: 3000,          // don't arm the trigger for the first N ms
    mobileTrigger: 'scrollUp', // 'scrollUp' | 'timeout' | 'none'
    mobileTimeout: 25000,
    scrollUpVelocity: 900,   // px/sec upward flick that counts as an exit
    lockScroll: true,

    // Popup stays closed for the rest of the browser session (sessionStorage).
    // The bar uses barDismissDays instead — that is the source file's behaviour.
    popupSessionKey: 'ldg_ld2026_popup_closed',
    barKey: 'ldg_ld2026_bar_until',

    loadFonts: false,        // true injects the Jost + Inter stylesheet

    // Visual tweaks go here, not in the CSS blobs further down. Appended last,
    // so these rules win. Scope them to #ldgExitModal or #ldgPromoBar.
    // Per variant if needed:
    //   extraCSS: '#ldgExitModal[data-ldg-variant="CAFR"] .ldg-modal__h{font-size:38px}'
    extraCSS: ''
  };

  /* =====================================================================
     2 · ARTWORK  (US has its own pair; CA-EN and CA-FR share one)
     ===================================================================== */
  var ART = {
    US:   { photo: 'photo-us.jpg', tag: 'tag-us.png' },
    CAEN: { photo: 'photo-ca.jpg', tag: 'tag-ca.png' },
    CAFR: { photo: 'photo-ca.jpg', tag: 'tag-ca.png' }
  };

  /* =====================================================================
     3 · MARKUP  (verbatim from the three design files)
     ===================================================================== */
  var BAR = {
    US:   `<div class="ldg ldg-bar" id="ldgPromoBar" data-ldg-countdown role="region" aria-label="Labor Day offer">
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
    CAEN: `<div class="ldg ldg-bar" id="ldgPromoBar" data-ldg-countdown role="region" aria-label="Labour Day offer">
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
    CAFR: `<div class="ldg ldg-bar" id="ldgPromoBar" data-ldg-countdown role="region" aria-label="Offre de la Fête du Travail">
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

  var MODAL = {
    US:   `<div class="ldg ldg-modal ldg-hide" id="ldgExitModal" data-ldg-countdown role="dialog" aria-modal="true" aria-label="Labor Day Sale — 50% off">
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
    CAEN: `<div class="ldg ldg-modal ldg-hide" id="ldgExitModal" data-ldg-countdown role="dialog" aria-modal="true" aria-label="Labour Day Sale — 50% off">
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
    CAFR: `<div class="ldg ldg-modal ldg-hide" id="ldgExitModal" data-ldg-countdown role="dialog" aria-modal="true" aria-label="Fête du Travail — 50 % de rabais">
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
     US and CA-EN are byte-identical; French carries its own set because the
     longer strings need different type sizes and timer spacing.
     ===================================================================== */
  var CSS_BASE = `
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

:root{
  --ldg-yellow:#FFF65B;
  --ldg-yellow-deep:#F2E627;
  --ldg-ink:#141313;
  --ldg-white:#FFFFFF;
  --ldg-display:"RL Aqva","ITC Avant Garde Gothic",Jost,"Helvetica Neue",Arial,sans-serif;
  --ldg-body:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --ldg-photo:url("__PHOTO__");
  --ldg-panel-ar:2944 / 1895;
  --ldg-tagimg:url("__TAG__");
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
   pill shifts right by exactly the arrow's diameter and the arrow's 'right'
   goes to '100% - diameter', landing its left edge at 0. They trade places
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

/* ---------- scoped reset (keeps host-site CSS out of the promo) ----------
   :where() carries zero specificity, so every component rule below wins. */
:where(#ldgPromoBar,#ldgPromoBar *,#ldgExitModal,#ldgExitModal *){
  box-sizing:border-box;margin:0;padding:0;min-width:0;border:0;outline:0;
  background:none;box-shadow:none;border-radius:0;float:none;
  font:inherit;color:inherit;text-align:left;text-decoration:none;
  text-transform:none;letter-spacing:inherit;line-height:inherit;
  list-style:none;vertical-align:baseline;
}
:where(#ldgPromoBar button,#ldgExitModal button){cursor:pointer}
:where(#ldgPromoBar svg,#ldgExitModal svg){display:block;flex:0 0 auto}
#ldgPromoBar .ldg-bar__msg a,#ldgExitModal .ldg-modal__fine a{text-decoration:underline}

/* ---------- host-page hardening ---------- */
#ldgExitModal.ldg-modal{z-index:2147483000;overflow-y:auto;overscroll-behavior:contain;
  align-items:safe center;justify-items:center}
#ldgExitModal .ldg-modal__box{margin:auto}
html.ldg-scroll-lock{overflow:hidden !important}
#ldgPromoBar[data-ldg-bar="sticky"]{position:sticky;top:0;z-index:2147482000}
#ldgPromoBar[data-ldg-bar="fixed"]{position:fixed;top:0;left:0;right:0;z-index:2147482000}

/* ---------- popup timer row: never let the countdown absorb overflow ------
   The row is five rigid items on one line. Only .ldg-count could shrink, so
   it took the whole overflow: its box shrank while the four chips kept their
   248px min-content and spilled right, painting over the 1px .ldg-timer__rule
   that follows them.
   How much the row overflows depends on the display font, and the design
   files preview in Jost while the site loads RL Aqva -- so a fix tuned to one
   measurement would not hold. This is an ordered degradation chain instead,
   with no number in it that depends on the font:
     1. tighter gap and padding (the French set's own values) -- ~28px back
     2. the countdown is fixed-size and never gives
     3. the region chip wraps to a second line before anything else moves
     4. failing that, the whole row wraps, exactly as it already does <=900px
   Whatever the metrics, items reflow instead of overlapping. */
#ldgExitModal .ldg-timer{flex-wrap:wrap;gap:14px 16px;padding:15px 22px 15px 20px}
#ldgExitModal .ldg-timer__lab{flex:0 0 auto}
#ldgExitModal .ldg-timer .ldg-count{flex:0 0 auto}
#ldgExitModal .ldg-timer__ends{flex:0 1 auto;min-width:0}
#ldgExitModal .ldg-timer__stack{flex:0 1 auto;min-width:0}
#ldgExitModal .ldg-timer__stack .ldg-chip{white-space:normal}
/* the rule is decoration; drop it rather than let it float once the row wraps */
#ldgExitModal .ldg-timer__rule{align-self:center}
@media (prefers-reduced-motion:reduce){
  #ldgPromoBar *,#ldgExitModal *{transition:none !important;animation:none !important}
}
`;
  var CSS_FR   = `
/* ==========================================================================
   LODGIFY — FÊTE DU TRAVAIL 2026 (QUÉBEC · FR) · PHOTO-BACKGROUND SET
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

:root{
  --ldg-yellow:#FFF65B;
  --ldg-yellow-deep:#F2E627;
  --ldg-ink:#141313;
  --ldg-white:#FFFFFF;
  --ldg-display:"RL Aqva","ITC Avant Garde Gothic",Jost,"Helvetica Neue",Arial,sans-serif;
  --ldg-body:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --ldg-photo:url("__PHOTO__");
  --ldg-panel-ar:2944 / 1895;
  --ldg-tagimg:url("__TAG__");
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
   pill shifts right by exactly the arrow's diameter and the arrow's 'right'
   goes to '100% - diameter', landing its left edge at 0. They trade places
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
  position:absolute;z-index:5;display:flex;align-items:center;gap:16px;
  padding:15px 22px 15px 20px;border-radius:20px;
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
.ldg-shot .ldg-timer__stack{flex-direction:column;align-items:flex-start;gap:7px;margin-left:0}
.ldg-shot .ldg-timer__stack .ldg-chip + .ldg-chip{padding-left:0;border-left:0}
.ldg-chip{display:flex;align-items:center;gap:10px;white-space:nowrap;
  font-size:13.5px;line-height:1.2;color:rgba(255,255,255,.75)}
.ldg-chip__ico{width:22px;display:flex;justify-content:center;flex:0 0 auto}
.ldg-chip__ico svg{width:20px;height:20px;color:var(--ldg-yellow)}
.ldg-chip b{color:var(--ldg-white);font-weight:600}
/* French runs longer than English: on a phone the region chip drops its
   middle clause so it still reads on one line. */
@media (max-width:720px){.ldg-hide-sm{display:none}}

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
.ldg-shot__in{position:relative;z-index:4;max-width:820px;padding:126px 0 0 60px}
.ldg-shot__h{
  font-family:var(--ldg-display);font-weight:700;text-transform:uppercase;
  font-size:clamp(34px,3.9vw,55px);line-height:1.0;letter-spacing:-.02em;margin:0;
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
  font-size:clamp(30px,3.2vw,40px);line-height:1.0;letter-spacing:-.02em;margin:0;
  text-shadow:0 2px 18px rgba(0,0,0,.35)}
.ldg-modal__sub{margin:16px 0 0;max-width:40ch;font-size:16px;line-height:1.5;
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
.ldg-modal .ldg-timer{left:16px;right:16px;bottom:18px}
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

/* ---------- scoped reset (keeps host-site CSS out of the promo) ----------
   :where() carries zero specificity, so every component rule below wins. */
:where(#ldgPromoBar,#ldgPromoBar *,#ldgExitModal,#ldgExitModal *){
  box-sizing:border-box;margin:0;padding:0;min-width:0;border:0;outline:0;
  background:none;box-shadow:none;border-radius:0;float:none;
  font:inherit;color:inherit;text-align:left;text-decoration:none;
  text-transform:none;letter-spacing:inherit;line-height:inherit;
  list-style:none;vertical-align:baseline;
}
:where(#ldgPromoBar button,#ldgExitModal button){cursor:pointer}
:where(#ldgPromoBar svg,#ldgExitModal svg){display:block;flex:0 0 auto}
#ldgPromoBar .ldg-bar__msg a,#ldgExitModal .ldg-modal__fine a{text-decoration:underline}

/* ---------- host-page hardening ---------- */
#ldgExitModal.ldg-modal{z-index:2147483000;overflow-y:auto;overscroll-behavior:contain;
  align-items:safe center;justify-items:center}
#ldgExitModal .ldg-modal__box{margin:auto}
html.ldg-scroll-lock{overflow:hidden !important}
#ldgPromoBar[data-ldg-bar="sticky"]{position:sticky;top:0;z-index:2147482000}
#ldgPromoBar[data-ldg-bar="fixed"]{position:fixed;top:0;left:0;right:0;z-index:2147482000}

/* ---------- popup timer row: never let the countdown absorb overflow ------
   The row is five rigid items on one line. Only .ldg-count could shrink, so
   it took the whole overflow: its box shrank while the four chips kept their
   248px min-content and spilled right, painting over the 1px .ldg-timer__rule
   that follows them.
   How much the row overflows depends on the display font, and the design
   files preview in Jost while the site loads RL Aqva -- so a fix tuned to one
   measurement would not hold. This is an ordered degradation chain instead,
   with no number in it that depends on the font:
     1. tighter gap and padding (the French set's own values) -- ~28px back
     2. the countdown is fixed-size and never gives
     3. the region chip wraps to a second line before anything else moves
     4. failing that, the whole row wraps, exactly as it already does <=900px
   Whatever the metrics, items reflow instead of overlapping. */
#ldgExitModal .ldg-timer{flex-wrap:wrap;gap:14px 16px;padding:15px 22px 15px 20px}
#ldgExitModal .ldg-timer__lab{flex:0 0 auto}
#ldgExitModal .ldg-timer .ldg-count{flex:0 0 auto}
#ldgExitModal .ldg-timer__ends{flex:0 1 auto;min-width:0}
#ldgExitModal .ldg-timer__stack{flex:0 1 auto;min-width:0}
#ldgExitModal .ldg-timer__stack .ldg-chip{white-space:normal}
/* the rule is decoration; drop it rather than let it float once the row wraps */
#ldgExitModal .ldg-timer__rule{align-self:center}
@media (prefers-reduced-motion:reduce){
  #ldgPromoBar *,#ldgExitModal *{transition:none !important;animation:none !important}
}
`;
  var CSS = { US: CSS_BASE, CAEN: CSS_BASE, CAFR: CSS_FR };

  /* =====================================================================
     5 · Helpers
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

  var memPopupClosed = false;
  function popupClosed() {
    if (memPopupClosed) return true;
    try { return window.sessionStorage.getItem(CONFIG.popupSessionKey) === '1'; }
    catch (e) { return false; }
  }
  function markPopupClosed() {
    memPopupClosed = true;
    try { window.sessionStorage.setItem(CONFIG.popupSessionKey, '1'); } catch (e) {}
  }

  function barDismissed() {
    var until = ls(CONFIG.barKey);
    return !!until && Number(until) > Date.now();
  }
  function markBarDismissed() {
    ls(CONFIG.barKey, String(Date.now() + CONFIG.barDismissDays * 864e5));
  }

  function expired() { return Date.now() >= END; }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }

  /* =====================================================================
     6 · Country + language
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

  function resolveLang() {
    var forced = (qs.get('ldlang') || '').toLowerCase();
    if (forced) return forced.slice(0, 2);
    if (CONFIG.lang.frPath.test(window.location.pathname)) return 'fr';
    if (CONFIG.lang.frHost.test(window.location.hostname)) return 'fr';
    if (CONFIG.lang.useHtmlLang) {
      var l = (document.documentElement.getAttribute('lang') || '').toLowerCase();
      if (l.slice(0, 2) === 'fr') return 'fr';
    }
    return 'en';
  }

  function resolveVariant(country) {
    if (country === 'US') return 'US';
    if (country === 'CA') return resolveLang() === 'fr' ? 'CAFR' : 'CAEN';
    return null;
  }

  /* =====================================================================
     7 · Render
     ===================================================================== */
  function mount(variant) {
    var art = ART[variant];

    if (CONFIG.loadFonts) {
      var f = document.createElement('link');
      f.rel = 'stylesheet';
      f.href = 'https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700' +
               '&family=Inter:wght@400;500;600;700&display=swap';
      document.head.appendChild(f);
    }

    var style = document.createElement('style');
    style.id = 'ldg-promo-css';
    style.textContent = CSS[variant]
      .replace('__PHOTO__', CONFIG.assetBase + art.photo)
      .replace('__TAG__',   CONFIG.assetBase + art.tag)
      + (CONFIG.extraCSS ? '\n\n/* CONFIG.extraCSS */\n' + CONFIG.extraCSS : '');
    document.head.appendChild(style);

    function build(html) {
      var host = document.createElement('div');
      host.innerHTML = html;
      var el = host.firstElementChild;
      el.setAttribute('data-ldg-variant', variant);
      return el;
    }

    /* ---- top bar ---- */
    var bar = null;
    if (CONFIG.showBar && !barDismissed()) {
      bar = build(BAR[variant]);
      bar.setAttribute('data-ldg-bar', CONFIG.barMode);
      document.body.insertBefore(bar, document.body.firstChild);
    }

    /* ---- popup ---- */
    var modal = null;
    if (CONFIG.showPopup && !popupClosed()) {
      modal = build(MODAL[variant]);
      document.body.appendChild(modal);
    }

    if (!bar && !modal) return;

    /* ---- countdown, shared by both ---- */
    var ticker = null;
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };

    function countdownRoots() {
      var out = [];
      if (bar && !bar.classList.contains('ldg-hide')) out.push(bar);
      if (modal && !modal.classList.contains('ldg-hide')) out.push(modal);
      return out;
    }

    function tick() {
      if (expired()) {
        if (bar) bar.classList.add('ldg-hide');
        if (modal) closeModal(true);
        stopTicker();
        return;
      }
      var s = Math.floor((END - Date.now()) / 1000);
      var vals = {
        days:    pad(Math.floor(s / 86400)),
        hours:   pad(Math.floor((s % 86400) / 3600)),
        minutes: pad(Math.floor((s % 3600) / 60)),
        seconds: pad(s % 60)
      };
      countdownRoots().forEach(function (root) {
        Object.keys(vals).forEach(function (u) {
          var el = root.querySelector('[data-unit="' + u + '"]');
          if (el && el.textContent !== vals[u]) el.textContent = vals[u];
        });
      });
    }
    function startTicker() { if (!ticker) { tick(); ticker = setInterval(tick, 1000); } }
    function stopTicker()  { if (ticker) { clearInterval(ticker); ticker = null; } }

    if (bar) startTicker();

    /* ---- open / close ---- */
    var lastFocus = null;
    var modalOpen = false;

    function openModal() {
      if (!modal || modalOpen || popupClosed() || expired()) return;
      modalOpen = true;
      lastFocus = document.activeElement;
      modal.classList.remove('ldg-hide');
      startTicker();
      tick();
      if (CONFIG.lockScroll) document.documentElement.classList.add('ldg-scroll-lock');
      var first = modal.querySelector('.ldg-modal__close');
      if (first) first.focus();
      disarm();
    }

    function closeModal(silent) {
      if (!modal) return;
      modalOpen = false;
      modal.classList.add('ldg-hide');
      if (CONFIG.lockScroll) document.documentElement.classList.remove('ldg-scroll-lock');
      if (!silent) {
        markPopupClosed();
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }
      if (!bar || bar.classList.contains('ldg-hide')) stopTicker();
      disarm();
    }

    function closeBar() {
      if (!bar) return;
      bar.classList.add('ldg-hide');
      markBarDismissed();
      if (!modalOpen) stopTicker();
    }

    document.addEventListener('click', function (e) {
      if (!(e.target instanceof Element)) return;
      var btn = e.target.closest('[data-ldg-dismiss]');
      if (!btn) return;
      if (btn.getAttribute('data-ldg-dismiss') === 'bar') closeBar();
      else closeModal();
    });

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();     // backdrop only
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modalOpen) closeModal();
      });
      // keep focus inside the dialog while it is open
      modal.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab' || !modalOpen) return;
        var items = modal.querySelectorAll('a[href], button:not([disabled])');
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }

    /* ---- copy the coupon code ---- */
    var copyTimers = new WeakMap();
    document.addEventListener('click', function (e) {
      if (!(e.target instanceof Element)) return;
      var btn = e.target.closest('[data-ldg-copy]');
      if (!btn) return;
      var label = btn.querySelector('[data-ldg-copy-label]');
      var code  = btn.getAttribute('data-ldg-copy');
      var isFr  = variant === 'CAFR';
      var okMsg = isFr ? 'Copie !' : 'Copied!';
      var noMsg = isFr ? 'Echec' : 'Copy failed';
      var flash = function (msg) {
        if (!label) return;
        clearTimeout(copyTimers.get(btn));
        label.textContent = msg;
        copyTimers.set(btn, setTimeout(function () { label.textContent = code; }, 1600));
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(
          function () { flash(okMsg); }, function () { flash(noMsg); }
        );
      } else { flash(noMsg); }
    });

    /* ===================================================================
       8 · Exit intent
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
      if (e.clientY > 0) return;                    // not through the top edge
      if (e.relatedTarget || e.toElement) return;   // moved into another element
      openModal();
    }

    function armScrollUp() {
      var lastY = window.scrollY, lastT = Date.now();
      on(window, 'scroll', function () {
        if (!armed) return;
        var y = window.scrollY, t = Date.now(), dt = (t - lastT) / 1000;
        if (dt > 0) {
          var v = (lastY - y) / dt;                 // positive = scrolling up
          if (v > CONFIG.scrollUpVelocity && y < 320) openModal();
        }
        lastY = y; lastT = t;
      }, { passive: true });
    }

    function arm() {
      if (!modal || popupClosed() || expired()) return;
      armed = true;
      var touch = window.matchMedia('(hover: none)').matches;
      if (!touch) {
        on(document, 'mouseout', onMouseOut);
      } else if (CONFIG.mobileTrigger === 'scrollUp') {
        armScrollUp();
      } else if (CONFIG.mobileTrigger === 'timeout') {
        var to = setTimeout(function () { if (armed) openModal(); }, CONFIG.mobileTimeout);
        on(window, 'pagehide', function () { clearTimeout(to); });
        cleanups.push(function () { clearTimeout(to); });
      }
    }

    if (modal && qs.get('ldexit') === '1') { openModal(); return; }
    if (modal) setTimeout(arm, CONFIG.armDelay);
  }

  /* =====================================================================
     9 · Boot
     ===================================================================== */
  if (qs.get('ldreset') === '1') {
    memPopupClosed = false;
    try { window.sessionStorage.removeItem(CONFIG.popupSessionKey); } catch (e) {}
    lsDel(CONFIG.barKey);
    lsDel(CONFIG.geoKey);
  }

  if (expired()) return;
  if (document.getElementById('ldgPromoBar') || document.getElementById('ldgExitModal')) return;

  resolveCountry().then(function (country) {
    if (CONFIG.countries.indexOf(country) === -1) return;
    var variant = resolveVariant(country);
    if (!variant) return;
    ready(function () { mount(variant); });
  });
})();