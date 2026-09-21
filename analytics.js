// Google Analytics 4. The measurement ID is a public identifier, not a secret —
// it ships in the served HTML of every GA-instrumented site. Real secrets
// (Measurement Protocol api_secret, Data API service accounts) never belong here.
(function () {
  var ID = 'G-HDBM0DGTCR';
  if (ID.indexOf('XXXX') !== -1) return; // not configured yet — stay silent

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());

  // Pageviews are sent manually rather than automatically. post.html sets its
  // title only after the markdown loads, so an automatic pageview would report
  // every article as the placeholder title that was in the HTML at load time.
  gtag('config', ID, { send_page_view: false });

  function pageView(params) {
    var p = { page_title: document.title, page_location: location.href };
    if (params) for (var k in params) if (params[k] != null) p[k] = params[k];
    gtag('event', 'page_view', p);
  }
  window.FA_ANALYTICS = { pageView: pageView };

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);

  // --- video engagement -----------------------------------------------------
  // GA4 only tracks embedded YouTube on its own; a self-hosted <video> emits
  // nothing. Media events do not bubble, but they can be caught in the capture
  // phase at document level, which also covers players added later by the app.
  // Everything here is wrapped so a failure can never affect playback.
  var MARKS = [25, 50, 75];
  function vinfo(el) {
    var d = el.duration;
    return {
      video_duration: isFinite(d) ? Math.round(d) : undefined,
      video_current_time: Math.round(el.currentTime || 0),
      video_title: (el.getAttribute('aria-label') || document.title || '').slice(0, 100),
      video_url: (el.currentSrc || (el.querySelector('source') || {}).src || ''),
      video_provider: 'self-hosted'
    };
  }
  function track(el, name, extra) {
    try {
      var p = vinfo(el);
      for (var k in extra) p[k] = extra[k];
      gtag('event', name, p);
    } catch (e) {}
  }
  function seen(el) {
    if (!el.__faSeen) el.__faSeen = {};
    return el.__faSeen;
  }
  try {
    document.addEventListener('play', function (e) {
      var el = e.target;
      if (!el || el.tagName !== 'VIDEO') return;
      if (el.closest && el.closest('#prerender')) return;   // the hidden copy
      var st = seen(el);
      if (!st.started) { st.started = true; track(el, 'video_start'); }
    }, true);

    document.addEventListener('timeupdate', function (e) {
      var el = e.target;
      if (!el || el.tagName !== 'VIDEO' || !isFinite(el.duration) || !el.duration) return;
      if (el.closest && el.closest('#prerender')) return;
      var st = seen(el), pct = (el.currentTime / el.duration) * 100;
      for (var i = 0; i < MARKS.length; i++) {
        var m = MARKS[i];
        if (pct >= m && !st['m' + m]) {
          st['m' + m] = true;
          track(el, 'video_progress', { video_percent: m });
        }
      }
    }, true);

    document.addEventListener('ended', function (e) {
      var el = e.target;
      if (!el || el.tagName !== 'VIDEO') return;
      if (el.closest && el.closest('#prerender')) return;
      var st = seen(el);
      if (!st.done) { st.done = true; track(el, 'video_complete', { video_percent: 100 }); }
    }, true);
  } catch (e) {}

  // Pages that resolve their own title asynchronously set FA_DEFER_PAGEVIEW
  // before this script and call FA_ANALYTICS.pageView() when they are ready.
  if (!window.FA_DEFER_PAGEVIEW) pageView();
})();
